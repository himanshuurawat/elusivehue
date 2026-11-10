/*
 * Dummy resale shelf data - layout preview only. These items, sellers and
 * prices are not real listings. The 3D sample model on the camera item
 * follows the approved direction: a listing shows the seller's own 3D model
 * when one exists, photos otherwise.
 */
import {resaleCamera, resaleBrushes, resaleJacket} from './artwork';

export type ResaleItem = {
  slug: string;
  img: string;
  title: string;
  seller: string;
  price: string;
  kind: string;
  blurb: string;
  model?: string;
};

const RU = '\u20B9';
const DOT = '\u00B7';

export const RESALE_ITEMS: ResaleItem[] = [
  {
    slug: 'volt-35mm-slr',
    img: resaleCamera,
    title: 'Volt 35mm SLR',
    seller: 'Aarav S. · Jaipur',
    price: `${RU}7,999`,
    kind: `Camera ${DOT} Good condition`,
    blurb: 'A working 35mm film SLR with a 50mm prime lens. Shutter fires cleanly at all speeds; light seals replaced last year. Sample listing for layout only.',
    model: '/models/antique-camera.glb',
  },
  {
    slug: 'studio-brush-set',
    img: resaleBrushes,
    title: 'Studio brush set of 12',
    seller: 'Priya M. · Pune',
    price: `${RU}850`,
    kind: `Art supplies ${DOT} Used`,
    blurb: 'Twelve mixed-round and flat brushes, cleaned and reshaped. Good for acrylic and gouache studies. Sample listing for layout only.',
  },
  {
    slug: 'black-denim-jacket',
    img: resaleJacket,
    title: 'Black denim jacket, M',
    seller: 'Dev R. · Delhi',
    price: `${RU}1,600`,
    kind: `Clothing ${DOT} Worn in`,
    blurb: 'Heavyweight black denim, broken in but no tears. Fits a true medium. Sample listing for layout only.',
  },
];
