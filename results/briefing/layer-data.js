/* Each file contains one measured height. The hosting server may deliver gzip or decoded JSON. */
window.readReportLayer = async function readReportLayer(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error('该高度的数据未能载入，请重试。');
  const blob = await response.blob();
  const signature = new Uint8Array(await blob.slice(0, 2).arrayBuffer());
  if (signature[0] !== 31 || signature[1] !== 139) return JSON.parse(await blob.text());
  const stream = blob.stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream).json();
};
