import { writeFile, mkdir } from 'node:fs/promises';
const items = [
  ['apex-solid', 'apex-solid-color-helmet'],
  ['apex-infinity', 'apex-infinity-helmet'],
  ['brutale-corsa', 'brutale-corsa-dual-spoiler-helmet'],
  ['retro-jet', 'retro-jet-west-helmet-wp'],
  ['mx-carbon', 'axor-mx-carbon-helmet'],
  ['kylo-solid', 'axor-kylo-solid-helmet'],
  ['agera-starry', 'axor-agera-starry-full-face-helmet-with-spoiler'],
  ['retro-autumn', 'retro-jet-autumn-open-face-helmet'],
];
await mkdir('public/images', { recursive: true });
const sources = [];
for (const [slug, handle] of items) {
  const product = await (await fetch(`https://axorhelmets.com/products/${handle}.js`)).json();
  const variant = product.variants.find((v) => /black/i.test(v.option1));
  const first = variant?.featured_image?.src || product.images[0];
  const normalize = (s) => s.replace(/^https?:/, '');
  const position = product.images.findIndex((s) => normalize(s) === normalize(first));
  const next = product.images[position + 1];
  const starts = new Set(product.variants.map((v) => normalize(v.featured_image?.src || '')));
  const images = [first, next && !starts.has(normalize(next)) ? next : first];
  for (let i = 0; i < images.length; i++) {
    const url = (images[i].startsWith('//') ? 'https:' : '') + images[i];
    const response = await fetch(url + (url.includes('?') ? '&' : '?') + 'width=1000');
    if (!response.ok) throw new Error(url);
    await writeFile(`public/images/${slug}-${i}.jpg`, Buffer.from(await response.arrayBuffer()));
    sources.push({
      file: `${slug}-${i}.jpg`,
      source: `https://axorhelmets.com/products/${handle}`,
      image: url,
    });
  }
  console.log(slug);
}
await writeFile('public/images/sources.json', JSON.stringify(sources, null, 2));
