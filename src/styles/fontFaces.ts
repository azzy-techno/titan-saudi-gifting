import { asset } from '@/lib/basePath'

/**
 * Arabic faces (OFL) + engraving faces as @font-face rules, rendered into the root layout <head>.
 * Generated (not a .css file) so the font URLs carry the base path on sub-path hosts (GitHub Pages).
 * Arabic faces are only fetched when Arabic text renders; preloaded on /ar pages only.
 */
export const arabicFontFaces = `@font-face {
  font-family: 'TSG Arabic Display';
  src: url('${asset('/fonts/alexandria-arabic-wght.woff2')}') format('woff2');
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
  unicode-range: U+0600-06FF, U+0750-077F, U+0870-088E, U+0890-0891, U+0898-08E1, U+08E3-08FF, U+200C-200E,
    U+2010-2011, U+204F, U+2E41, U+FB50-FDFF, U+FE70-FE74, U+FE76-FEFC;
}
@font-face {
  font-family: 'TSG Arabic Digits';
  src: url('${asset('/fonts/alexandria-arabic-wght.woff2')}') format('woff2');
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
  unicode-range: U+0660-0669, U+066B-066C, U+06F0-06F9;
}
@font-face {
  font-family: 'TSG Arabic Text';
  src: url('${asset('/fonts/plex-sans-arabic-400.woff2')}') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
  unicode-range: U+0600-06FF, U+0750-077F, U+0870-088E, U+0890-0891, U+0898-08E1, U+08E3-08FF, U+200C-200E,
    U+2010-2011, U+204F, U+2E41, U+FB50-FDFF, U+FE70-FE74, U+FE76-FEFC;
}
@font-face {
  font-family: 'TSG Arabic Text';
  src: url('${asset('/fonts/plex-sans-arabic-500.woff2')}') format('woff2');
  font-weight: 500 700;
  font-style: normal;
  font-display: swap;
  unicode-range: U+0600-06FF, U+0750-077F, U+0870-088E, U+0890-0891, U+0898-08E1, U+08E3-08FF, U+200C-200E,
    U+2010-2011, U+204F, U+2E41, U+FB50-FDFF, U+FE70-FE74, U+FE76-FEFC;
}
:root {
  --ff-ar-digits: 'TSG Arabic Digits';
  --ff-ar-display: 'TSG Arabic Digits', 'TSG Arabic Display';
  --ff-ar-text: 'TSG Arabic Digits', 'TSG Arabic Text';
}
@font-face {
  font-family: 'TSG Engrave Latin';
  src: url('${asset('/fonts/plex-sans-latin-500.woff2')}') format('woff2');
  font-weight: 500;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'TSG Engrave Arabic';
  src: url('${asset('/fonts/plex-sans-arabic-500.woff2')}') format('woff2');
  font-weight: 500;
  font-style: normal;
  font-display: swap;
  unicode-range: U+0600-06FF, U+0750-077F, U+08A0-08FF, U+FB50-FDFF, U+FE70-FEFF, U+200C-200E;
}`
