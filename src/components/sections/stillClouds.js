// Pictures of the home page's particle clouds in their default positions (screenshots of each, about 1200px, on the page's own mint background -
// they are not transparent, so they only sit on a page of that colour), shown in the clouds' places when the page-wide particle canvas cannot
// run (a model file fails to load, or there is no WebGL).
//
// `fit` says how big each picture is and where it stands in its box. `desk` (from xl up, where a row is the box beside the copy) matches the live
// cloud it replaces: measured from the page. `stack` (below xl, where the box sits above or below the copy) just centres the picture's dots in the
// box. The units are cqw, 1% of the box's width: `w` the picture's width, `x` / `y` where its centre is from the centre of the box. (Each picture
// is of a 2x screen, so it is shown at about half its pixel size.) The YouTube and LinkedIn clouds have no box on the live page; their `desk`
// is for the same box the themes' clouds stand in. `aspect`: the picture's width over its height. `edge`: the empty margin above and below its dots, in
// % of its height (so that on the phone the dots, not the picture, can stand right next to the copy). `cropTop`: its top, as far as the height of the
// page header, is masked off.
import brain from '../../assets/images/clouds/brain.webp'
import vlsi from '../../assets/images/clouds/vlsi.webp'
import dna from '../../assets/images/clouds/dna.webp'
import city from '../../assets/images/clouds/city.webp'
import arm from '../../assets/images/clouds/arm.webp'
import youtube from '../../assets/images/clouds/youtube.webp'
import linkedin from '../../assets/images/clouds/linkedin.webp'

export const STILL_CLOUDS = {
  brain: {
    src: brain,
    alt: 'A brain made of particles',
    edge: { top: 15.3, bottom: 13.3 },
    aspect: 1.02,
    fit: { desk: { w: 103.5, x: -0.3, y: -2.5 }, stack: { w: 113.8, x: -0.4, y: -1.1 } },
  },
  vlsi: {
    src: vlsi,
    alt: 'A hand placing a chip on a circuit board, made of particles',
    edge: { top: 7.2, bottom: 2.8 },
    aspect: 0.984,
    fit: { desk: { w: 143.4, x: -2.8, y: 2.7 }, stack: { w: 118.8, x: -1.3, y: -2.7 } },
  },
  dna: {
    src: dna,
    alt: 'DNA double helices made of particles',
    edge: { top: 0, bottom: 0.3 },
    aspect: 0.955,
    cropTop: true,
    fit: { desk: { w: 141.5, x: -7.3, y: -5.6 }, stack: { w: 118.7, x: -3.5, y: 0.2 } },
  },
  city: {
    src: city,
    alt: 'A smart city made of particles',
    edge: { top: 11.6, bottom: 7.6 },
    aspect: 1.102,
    fit: { desk: { w: 132.5, x: 0.2, y: 2.6 }, stack: { w: 111.3, x: 0.2, y: -2.1 } },
  },
  arm: {
    src: arm,
    alt: 'Robotic arms of a smart factory made of particles',
    edge: { top: 7.3, bottom: 4.8 },
    aspect: 1.098,
    fit: { desk: { w: 146.7, x: 0.6, y: -3.8 }, stack: { w: 113, x: -0.1, y: -1.3 } },
  },
  youtube: {
    src: youtube,
    alt: 'A chip with the YouTube logo, made of particles',
    edge: { top: 18.7, bottom: 10.1 },
    aspect: 1.347,
    fit: { desk: { w: 141.4, x: 0.4, y: -4.4 }, stack: { w: 106, x: 0.3, y: -3.3 } },
  },
  linkedin: {
    src: linkedin,
    alt: 'A chip with the LinkedIn logo, made of particles',
    edge: { top: 13.7, bottom: 5.9 },
    aspect: 1.41,
    fit: { desk: { w: 139, x: 0.2, y: -3.8 }, stack: { w: 104.3, x: 0.1, y: -2.9 } },
  },
}
