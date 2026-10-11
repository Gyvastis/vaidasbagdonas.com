// builds demo/<name>/anon.html: a scrubbed copy of index.html (no client names, contacts, addresses, codes in source or head)
// served at the neutral alias /demo/<slug>/ through the rewrites in vercel.json (the public URL carries no company name). run: node tools/make-anon.mjs
import { readFileSync, writeFileSync } from 'fs';

const sp = '(?:\\s|&nbsp;|\\u00a0)+';
const phone = new RegExp(`\\+370(?:${sp})*\\d(?:${sp}|\\d){6,}`, 'g');
const mail = /[\w.+-]+@(?!pavyzdys\.lt)[\w-]+(?:\.[\w-]+)+/g;
const common = [
  [/src="logo(?:-white)?\.(?:svg|png)"/g, 'src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"'],
  [/tel:\+370\d+/g, 'tel:+37000000000'],
  [phone, '+370&nbsp;000&nbsp;00000'],
  [mail, 'info@pavyzdys.lt'],
];

const demos = {
  visdenta: {
    slug: 'klinika',
    head: { title: 'Odontologijos klinika', description: 'Dantų gydymas, protezavimas, implantacija, ortodontija ir higiena. Registracija internetu. Dizaino pavyzdys.', ogDescription: 'Dantų gydymas, implantai, ortodontija ir higiena. Dizaino pavyzdys.' },
    rules: [
      [new RegExp(`UAB${sp}„Maxilė“,${sp}įm\\.${sp}k\\.${sp}\\d+${sp}·${sp}UAB${sp}„Visdenta“,${sp}įm\\.${sp}k\\.${sp}\\d+`, 'g'), 'UAB „Pavyzdys“'],
      [/Savanori%C5%B3\+pr\.\+241%2C\+Kaunas|K\.\+Bar%C5%A1ausko\+g\.\+68%2C\+Kaunas/g, 'Kaunas'],
      [new RegExp(`Savanorių${sp}pr\\.${sp}241(?:-56)?`, 'g'), 'Pavyzdžio g. 1'],
      [new RegExp(`K\\.${sp}Baršausko${sp}g\\.${sp}68`, 'g'), 'Pavyzdžio g. 2'],
      [new RegExp(`Savanorių${sp}pr\\.`, 'g'), 'Pavyzdžio g.'],
      [new RegExp(`K\\.${sp}Baršausko${sp}g\\.`, 'g'), 'Pavyzdžio g.'],
      [/\d{9}/g, (m) => (/^(234614740|302665247)$/.test(m) ? 'XXXXXXXXX' : m)],
      [/Visdenta/g, 'Klinika'],
      [/Maxilė/g, 'Klinika'],
      [/visdenta/g, 'pavyzdys'],
    ],
  },
  glosaris: {
    slug: 'statyba',
    head: { title: 'Statybos ir remonto darbai', description: 'Pamatai, mūras, apdaila ir tvoros. Statybos ir remonto įmonė – darbai su atestuoto statybos darbų vadovo priežiūra. Dizaino pavyzdys.', ogDescription: 'Pamatai, mūras, apdaila ir tvoros. Užklausa sąmatai – per vieną minutę. Dizaino pavyzdys.' },
    rules: [
      [/Kęstutis Tamulionis|Dovilė Tamulionienė/g, 'Vardas Pavardė'],
      [/302852777|LT100007133912/g, 'XXXXXXXXX'],
      [new RegExp(`S\\.${sp}Nėries${sp}g\\.${sp}24(?:-82)?`, 'g'), 'Adresas'],
      [/S\.\+N%C4%97ries\+g\.\+24%2C\+Vilnius/g, 'Vilnius'],
      [/UAB „Glosaris“/g, 'Statybos įmonė'],
      [/Glosaris/g, 'Statybos įmonė'],
      [/glosaris/g, 'pavyzdys'],
    ],
  },
  runmis: {
    slug: 'viesbutis',
    head: { title: 'Viešbutis – nakvynė Vilniuje', description: 'Šeimyninis viešbutis Vilniuje: kambariai ir apartamentai, saugoma aikštelė, aptarnavimas keliomis kalbomis. Dizaino pavyzdys.', ogDescription: 'Šeimyninis viešbutis Vilniuje. Kambariai ir apartamentai, saugoma aikštelė. Dizaino pavyzdys.' },
    rules: [
      [/120092459/g, 'XXXXXXXXX'],
      [new RegExp(`Panevėžio${sp}g\\.${sp}8a,${sp}LT-02112${sp}Vilnius`, 'g'), 'Gatvė, Vilnius'],
      [new RegExp(`Panevėžio${sp}g\\.${sp}8a`, 'g'), 'Gatvė'],
      [/Panev%C4%97%C5%BEio\+g\.\+8a,\+Vilnius/g, 'Vilnius'],
      [/UAB RunMiS/g, 'UAB „Pavyzdys“'],
      [/Hotel RunMiS|RunMiS Family Hotels|RunMiS/g, 'Viešbutis'],
      [/runmis/g, 'pavyzdys'],
    ],
  },
};

const force = [
  [/\/\[\?&\]anon\\b\/\.test\(location\.search\)/g, 'true'],
  [/\/\[\?&\]anon=1\/\.test\(location\.search\)/g, 'true'],
];

for (const [name, cfg] of Object.entries(demos)) {
  const dir = new URL(`../demo/${name}/`, import.meta.url);
  let html = readFileSync(new URL('index.html', dir), 'utf8');
  for (const [pattern, replacement] of [...common, ...cfg.rules, ...force, [/var S='[\s\S]*?\]\];\nfunction fix/, 'var R=[];\nfunction fix']]) html = html.replace(pattern, replacement);

  const { title, description, ogDescription } = cfg.head;
  html = html
    .replace(/<title>.*?<\/title>/, `<title>${title}</title>`)
    .replace(/(<meta name="description" content=")[^"]*"/, `$1${description}"`)
    .replace(/(<meta property="og:title" content=")[^"]*"/, `$1${title}"`)
    .replace(/(<meta property="og:description" content=")[^"]*"/, `$1${ogDescription}"`)
    .replace(/(<meta property="og:image" content="https:\/\/vaidasbagdonas\.com\/demo\/)[a-z]+\/og\.jpg"/, `$1${cfg.slug}/anon/og.jpg"`)
    .replace(/<link rel="preload" as="image"[^>]*>\n?/g, '')
    .replace('<meta charset="utf-8">', `<meta charset="utf-8">\n<base href="/demo/${cfg.slug}/">`);
  writeFileSync(new URL('anon.html', dir), html);
  console.log(name, 'anon.html', html.length);
}
