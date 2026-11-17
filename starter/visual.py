"""Convert per-link STL or indexed JSON meshes into the viewer's millimetre format."""
import json
import math
from pathlib import Path
import struct


def read_mesh(path):
    path = Path(path)
    if path.suffix.lower() == '.json':
        data = json.loads(path.read_text(encoding='utf-8-sig'))
        return data['vertices_mm'], data['triangles']
    if path.suffix.lower() != '.stl':
        raise ValueError('Use STL or indexed mesh JSON.')
    raw = path.read_bytes()
    points = []
    if len(raw) >= 84 and 84 + struct.unpack_from('<I', raw, 80)[0]*50 == len(raw):
        for offset in range(84, len(raw), 50):
            points.extend([list(struct.unpack_from('<3f', raw, offset+12+i*12)) for i in range(3)])
    else:
        for line in raw.decode('ascii').splitlines():
            fields = line.split()
            if fields and fields[0].lower() == 'vertex':
                if len(fields) != 4:
                    raise ValueError('Malformed STL vertex.')
                points.append([float(x) for x in fields[1:]])
    if not points or len(points) % 3:
        raise ValueError('STL has no complete triangle set.')
    vertices, faces, indices = [], [], {}
    for offset in range(0, len(points), 3):
        face = []
        for point in points[offset:offset+3]:
            key = tuple(point)
            if key not in indices:
                indices[key] = len(vertices)
                vertices.append(point)
            face.append(indices[key])
        faces.append(face)
    return vertices, faces


def build_visual(manifest_path, robot_hash, rigid):
    path = Path(manifest_path)
    manifest = json.loads(path.read_text(encoding='utf-8-sig'))
    if manifest.get('units') != 'mm':
        raise ValueError('Explicitly convert mesh dimensions to millimetres before packing.')
    parts = []
    for source in manifest['parts']:
        index = source['link_index']
        if not isinstance(index, int) or not 0 <= index <= 6:
            raise ValueError('link_index must be 0..6.')
        rigid(source['link_T_mesh'])
        vertices, faces = read_mesh(path.parent/source['file'])
        if any(len(v) != 3 or not all(math.isfinite(x) for x in v) for v in vertices):
            raise ValueError('Invalid mesh coordinates.')
        if any(len(f) != 3 or not all(isinstance(i, int) and 0 <= i < len(vertices) for i in f) for f in faces):
            raise ValueError('Invalid mesh indices.')
        if not faces:
            raise ValueError('Empty mesh.')
        color = source.get('color_rgb', [177, 195, 205])
        if len(color) != 3 or not all(isinstance(c,(float,int)) and 0 <= c <= 255 for c in color):
            raise ValueError('Invalid RGB color.')
        parts.append(dict(name=source['name'], link_index=index, link_T_mesh=source['link_T_mesh'],
                          vertices_mm=vertices, triangles=faces, color_rgb=color))
    if not 1 <= len(parts) <= 100 or sum(len(p['triangles']) for p in parts) > 500000:
        raise ValueError('Use 1..100 mesh parts, at most 500,000 triangles total.')
    return dict(schema='six-r-visual-v1', units='mm', robot_sha256=robot_hash,
                sources=manifest.get('sources', []), parts=parts)
