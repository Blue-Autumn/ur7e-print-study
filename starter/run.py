"""Small six-revolute-joint standard-DH FK and position IK example. Python 3.10+."""
import argparse
import hashlib
import json
import math
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from functools import partial

ROOT = Path(__file__).resolve().parent
VERSION = 'dh-position-dls-1.0'


def read(path):
    return json.loads(Path(path).read_text(encoding='utf-8-sig'))


def identity():
    return [[float(i == j) for j in range(4)] for i in range(4)]


def multiply(a, b):
    return [[sum(a[i][k] * b[k][j] for k in range(4)) for j in range(4)] for i in range(4)]


def fingerprint(value):
    def normalize(v):
        if isinstance(v, dict):
            return {k: normalize(x) for k, x in v.items()}
        if isinstance(v, list):
            return [normalize(x) for x in v]
        if isinstance(v, (float, int)) and not isinstance(v, bool):
            mantissa, exponent = format(v if v else 0, '.12e').split('e')
            return {'$number': mantissa + 'e' + str(int(exponent))}
        return v
    return hashlib.sha256(json.dumps(normalize(value), sort_keys=True, separators=(',', ':'), ensure_ascii=False,
                                    allow_nan=False).encode('utf-8')).hexdigest()


def rigid(t):
    if len(t) != 4 or any(len(row) != 4 for row in t):
        raise ValueError('A transform must be a nested 4 x 4 array.')
    if not all(math.isfinite(x) for row in t for x in row):
        raise ValueError('Transform values must be finite.')
    if any(abs(t[3][j] - [0, 0, 0, 1][j]) > 1e-8 for j in range(4)):
        raise ValueError('Invalid transform last row.')
    for i in range(3):
        for j in range(3):
            if abs(sum(t[k][i] * t[k][j] for k in range(3)) - (i == j)) > 1e-6:
                raise ValueError('Rotation must be orthonormal.')
    determinant = sum(t[0][j] * (t[1][(j+1)%3] * t[2][(j+2)%3] -
                               t[1][(j+2)%3] * t[2][(j+1)%3]) for j in range(3))
    if abs(determinant - 1) > 1e-6:
        raise ValueError('Rotation must be right-handed.')


def validate_inputs(robot, scene):
    if robot['schema'] != 'six-r-dh-v1' or robot['units'] != {'length': 'mm', 'angle': 'rad'}:
        raise ValueError('Expected six-r-dh-v1, millimetres and radians.')
    if len(robot['joints']) != 6:
        raise ValueError('Exactly six revolute joints are supported.')
    for joint in robot['joints']:
        if joint['type'] != 'revolute' or joint['sign'] not in (-1, 1):
            raise ValueError('Only revolute joints with sign +1 or -1 are supported.')
        values = [joint[k] for k in ('a_mm', 'd_mm', 'alpha_rad', 'offset_rad')] + joint['limits_rad']
        if len(joint['limits_rad']) != 2 or not all(math.isfinite(v) for v in values):
            raise ValueError('Invalid DH values or limits.')
        if joint['limits_rad'][0] >= joint['limits_rad'][1]:
            raise ValueError('Invalid joint limits.')
    if scene['schema'] != 'six-r-scene-v1':
        raise ValueError('Unknown scene schema.')
    rigid(scene['world_T_base'])
    rigid(scene['flange_T_tcp'])
    q = scene['start_q_rad']
    if len(q) != 6 or not all(math.isfinite(x) and j['limits_rad'][0] <= x <= j['limits_rad'][1]
                             for x, j in zip(q, robot['joints'])):
        raise ValueError('Start angles must be within the absolute joint limits.')


def forward(robot, scene, q):
    """T maps local column vectors into parent coordinates. Standard DH."""
    t = scene['world_T_base']
    chain = [t]
    for joint, angle in zip(robot['joints'], q):
        theta = joint['sign'] * angle + joint['offset_rad']
        c, s = math.cos(theta), math.sin(theta)
        ca, sa = math.cos(joint['alpha_rad']), math.sin(joint['alpha_rad'])
        a, d = joint['a_mm'], joint['d_mm']
        t = multiply(t, [[c, -s*ca, s*sa, a*c], [s, c*ca, -c*sa, a*s],
                         [0, sa, ca, d], [0, 0, 0, 1]])
        chain.append(t)
    return chain, multiply(t, scene['flange_T_tcp'])


def xyz(t):
    return [t[i][3] for i in range(3)]


def linear3(a, b):
    rows = [list(row) + [v] for row, v in zip(a, b)]
    for col in range(3):
        pivot = max(range(col, 3), key=lambda i: abs(rows[i][col]))
        rows[col], rows[pivot] = rows[pivot], rows[col]
        scale = rows[col][col]
        if abs(scale) < 1e-14:
            raise ValueError('Singular numerical system.')
        rows[col] = [x / scale for x in rows[col]]
        for i in range(3):
            if i != col:
                scale = rows[i][col]
                rows[i] = [x - scale*y for x, y in zip(rows[i], rows[col])]
    return [row[3] for row in rows]


def solve_position(robot, scene, target, initial):
    q = list(initial)
    for _ in range(100):
        p = xyz(forward(robot, scene, q)[1])
        error = [a-b for a, b in zip(target, p)]
        if math.dist(target, p) < 0.02:
            return q
        columns = []
        for j in range(6):
            shifted = q.copy()
            shifted[j] += 1e-6
            tip = xyz(forward(robot, scene, shifted)[1])
            columns.append([(tip[i]-p[i])/1e-6 for i in range(3)])
        normal = [[sum(c[i]*c[j] for c in columns) + (4 if i == j else 0)
                   for j in range(3)] for i in range(3)]
        step = linear3(normal, error)
        delta = [sum(c[i]*step[i] for i in range(3)) for c in columns]
        scale = min(1, 0.04 / max(max(abs(x) for x in delta), 1e-12))
        q = [max(j['limits_rad'][0], min(j['limits_rad'][1], x+dx*scale))
             for x, dx, j in zip(q, delta, robot['joints'])]
    raise ValueError('Position IK failed. Reduce the displacement or provide a different start posture.')


def calculate(robot, scene):
    validate_inputs(robot, scene)
    spec = scene['demo']
    displacement = spec['displacement_world_mm']
    steps = spec['samples']
    if not isinstance(steps, int) or not 2 <= steps <= 500 or len(displacement) != 3:
        raise ValueError('Use 2..500 samples and a three-component world displacement.')
    if not all(math.isfinite(x) for x in displacement):
        raise ValueError('Displacement must be finite.')
    q = scene['start_q_rad'].copy()
    origin = xyz(forward(robot, scene, q)[1])
    samples = []
    for i in range(steps):
        target = [p+d*i/(steps-1) for p, d in zip(origin, displacement)]
        q = solve_position(robot, scene, target, q)
        samples.append({'q_rad': q, 'world_T_tcp': forward(robot, scene, q)[1], 'target_xyz_mm': target})
    result = {'schema': 'six-r-result-v1', 'robot': robot, 'scene': scene,
              'robot_sha256': fingerprint(robot), 'scene_sha256': fingerprint(scene),
              'solver': {'name': VERSION, 'source_sha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
                         'task': 'position_only', 'orientation': 'unconstrained'},
              'assessment': {'reachability': 'sampled_pass', 'path': 'sampled_continuity_pass',
                             'collision': 'not_checked', 'geometry': 'kinematic_skeleton'},
              'samples': samples}
    validate_result(result)
    return result


def validate_result(result):
    if result['schema'] != 'six-r-result-v1':
        raise ValueError('Unknown result schema.')
    robot, scene = result['robot'], result['scene']
    validate_inputs(robot, scene)
    if result['robot_sha256'] != fingerprint(robot) or result['scene_sha256'] != fingerprint(scene):
        raise ValueError('Robot or scene identity mismatch. Recompute the result after changing inputs.')
    if not result['solver']['name'] or not result['solver']['source_sha256']:
        raise ValueError('Solver identity is required.')
    status = result['assessment']
    if status['reachability'] not in ('sampled_pass', 'not_checked') or status['path'] not in ('sampled_continuity_pass', 'not_checked'):
        raise ValueError('Unknown reachability or path assessment.')
    if status['collision'] not in ('not_checked', 'sampled_clear', 'hit'):
        raise ValueError('Unknown collision assessment.')
    if status['collision'] != 'not_checked' and not result.get('collision_evidence'):
        raise ValueError('Collision checks require geometry, method, spacing and provenance evidence.')
    if status['geometry'] != 'kinematic_skeleton':
        raise ValueError('This viewer supports a kinematic skeleton.')
    samples = result['samples']
    if not 2 <= len(samples) <= 100000:
        raise ValueError('Expected 2..100000 samples.')
    previous = None
    maximum_error = 0
    for sample in samples:
        q = sample['q_rad']
        if len(q) != 6 or not all(math.isfinite(x) and j['limits_rad'][0] <= x <= j['limits_rad'][1]
                                 for x, j in zip(q, robot['joints'])):
            raise ValueError('Invalid joint values or lifted angles outside limits.')
        rigid(sample['world_T_tcp'])
        computed = forward(robot, scene, q)[1]
        if max(abs(computed[i][j]-sample['world_T_tcp'][i][j]) for i in range(4) for j in range(4)) > 1e-5:
            raise ValueError('TCP matrix does not match joint FK and model.')
        if status['reachability'] == 'sampled_pass':
            target = sample['target_xyz_mm']
            if len(target) != 3 or not all(math.isfinite(x) for x in target):
                raise ValueError('Expected a finite world target.')
            maximum_error = max(maximum_error, math.dist(xyz(computed), target))
            if maximum_error > 0.05:
                raise ValueError('TCP target residual exceeds 0.05 mm.')
        if previous and status['path'] == 'sampled_continuity_pass' and max(abs(a-b) for a,b in zip(previous,q)) > 0.1:
            raise ValueError('Adjacent absolute joint angles exceed 0.1 rad. Subdivide or mark path not_checked.')
        previous = q
    if max(abs(a-b) for a,b in zip(samples[0]['q_rad'],scene['start_q_rad'])) > 1e-8:
        raise ValueError('The first sample must match scene.start_q_rad.')
    return {'nodes': len(samples), 'max_target_error_mm': maximum_error}


def save(path, result):
    Path(path).write_text(json.dumps(result, ensure_ascii=False, indent=2, allow_nan=False)+'\n', encoding='utf-8')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='command', required=True)
    compute = sub.add_parser('compute')
    compute.add_argument('--robot', type=Path, default=ROOT/'robot.json')
    compute.add_argument('--scene', type=Path, default=ROOT/'scene.json')
    compute.add_argument('--out', type=Path, default=ROOT/'example.json')
    ingest = sub.add_parser('import')
    ingest.add_argument('input', type=Path)
    ingest.add_argument('--out', type=Path, default=ROOT/'imported.json')
    server = sub.add_parser('serve')
    server.add_argument('--result', type=Path, default=ROOT/'example.json')
    server.add_argument('--port', type=int, default=8766)
    args = parser.parse_args()
    if args.command == 'compute':
        result = calculate(read(args.robot), read(args.scene))
        save(args.out, result)
        print(args.out, validate_result(result))
    elif args.command == 'import':
        result = read(args.input)
        print(validate_result(result))
        save(args.out, result)
    else:
        result = read(args.result)
        print(validate_result(result), flush=True)
        payload = json.dumps(result, ensure_ascii=False, allow_nan=False).encode('utf-8')

        class Handler(SimpleHTTPRequestHandler):
            def do_GET(self):
                if self.path.split('?')[0] == '/example.json':
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json; charset=utf-8')
                    self.send_header('Content-Length', str(len(payload)))
                    self.end_headers()
                    self.wfile.write(payload)
                else:
                    super().do_GET()

        httpd = ThreadingHTTPServer(('127.0.0.1', args.port), partial(Handler, directory=str(ROOT)))
        print(f'Open http://127.0.0.1:{httpd.server_port}/viewer.html — Ctrl+C to stop', flush=True)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass
        finally:
            httpd.server_close()


if __name__ == '__main__':
    main()
