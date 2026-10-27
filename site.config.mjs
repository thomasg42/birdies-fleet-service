// Every fact the site may print. Status lives with the fact. UNCONFIRMED items are not rendered.
import { DEFAULT_RULES } from './src/assets/birdies-core.js';

export const LIVE_STATUSES = new Set(['PUBLIC', 'STATED']);

export const PAIRS = [
  ['#EFE8DC', '#0F0D0B', 'small'],
  ['#EFE8DC', '#171411', 'small'],
  ['#EFE8DC', '#221D18', 'small'],
  ['#EFE8DC', '#3A2A1E', 'small'],
  ['#EFE8DC', '#1F3326', 'small'],
  ['#EFE8DC', '#2F4A37', 'small'],
  ['#E2D7C5', '#171411', 'small'],
  ['#E2D7C5', '#3A2A1E', 'small'],
  ['#B89A72', '#171411', 'small'],
  ['#B89A72', '#3A2A1E', 'small'],
  ['#B89A72', '#0F0D0B', 'small'],
  ['#1C1814', '#EFE8DC', 'small'],
  ['#1C1814', '#E2D7C5', 'small'],
  ['#4A4037', '#EFE8DC', 'small'],
  ['#4A4037', '#E2D7C5', 'small'],
  ['#0F0D0B', '#E8631C', 'small'],
];

export const SITE = {
  name: 'Birdie’s Fleet Service & Backcountry Repair',
  shortName: 'Birdie’s',
  owner: 'Jay Smith',
  tagline: 'We come to you.',
  slogan: 'Keep Exploring',
  cardLines: [
    "Can't get it to the shop? We'll come to you.",
    'We come to you.',
    'Keep Exploring',
  ],
  trust: 'Insured. Locally owned. Jay Smith, owner and mobile mechanic.',
  region: 'Southwest Montana',
  url: 'https://birdiesfleet.com',
  customDomain: 'birdiesfleet.com',
  launched: false,
  leadEndpoint: 'https://birdies-booking.forevergoldai.workers.dev/leads',
  phone: { display: '435-531-4127', e164: '+14355314127', schema: '+1-435-531-4127' },
  booking: { api: 'https://birdies-booking.forevergoldai.workers.dev', ...DEFAULT_RULES },
  logo: null,
  photos: {
  "forest": {
    "src": "photos/forest.webp",
    "width": 1000,
    "height": 667,
    "alt": "Stock photograph: real evergreen trees and mountain peaks.",
    "credit": "Fern / Unsplash",
    "source": "https://unsplash.com/photos/a-view-of-a-mountain-range-from-a-highway-g9yqkaU7o6k"
  },
  "road": {
    "src": "photos/road.webp",
    "width": 1000,
    "height": 667,
    "alt": "Stock photograph: a dirt road among real pine trees.",
    "credit": "Snejina Nikolova / Pexels",
    "source": "https://www.pexels.com/photo/tall-trees-near-a-dirt-road-4316627/"
  },
  "pickup": {
    "src": "photos/pickup.webp",
    "width": 1000,
    "height": 667,
    "alt": "Stock photograph: a white pickup in a conifer forest; not the Birdie’s service truck.",
    "credit": "JBC Media Company / Pexels",
    "source": "https://www.pexels.com/photo/white-pickup-truck-in-scenic-forest-landscape-32104658/"
  },
  "mechanic": {
    "src": "photos/mechanic.webp",
    "width": 1000,
    "height": 667,
    "alt": "Stock photograph: a mechanic inspecting a truck engine; not Jay or a Birdie’s job.",
    "credit": "Gustavo Fring / Pexels",
    "source": "https://www.pexels.com/photo/a-man-checking-the-engine-6720519/"
  },
  "equipment": {
    "src": "photos/equipment.webp",
    "width": 1000,
    "height": 667,
    "alt": "Stock photograph: an excavator at a construction site in Missoula.",
    "credit": "John Kakuk / Unsplash",
    "source": "https://unsplash.com/photos/a-construction-vehicle-in-a-dirt-field-GK3GYxaFc-8"
  },
  "fleet": {
    "src": "photos/fleet.webp",
    "width": 1000,
    "height": 667,
    "alt": "Stock photograph: refrigerated trailers parked in a yard.",
    "credit": "Tom Jackson / Pexels",
    "source": "https://www.pexels.com/photo/view-of-parked-trucks-27099094/"
  },
  "trucks": {
    "src": "photos/trucks.webp",
    "width": 1000,
    "height": 667,
    "alt": "Stock photograph: commercial trucks parked in a row.",
    "credit": "YL Lew / Pexels",
    "source": "https://www.pexels.com/photo/colorful-semi-trucks-parked-in-open-lot-35996049/"
  }
},
  updated: '2026-10-22',
  assetVersion: '20261022-v0',
  categories: [
    {
      id: 'fleet',
      status: 'PUBLIC',
      name: 'Fleet maintenance',
      href: 'fleet-maintenance',
      items: ['Preventative maintenance', 'Diagnostics', 'Emergency fleet repairs', 'DOT inspections'],
    },
    {
      id: 'mobile',
      status: 'PUBLIC',
      name: 'Mobile repair',
      href: 'mobile-repair',
      items: ['Brakes', 'Suspension', 'Steering', 'Wheel bearings', 'Batteries', 'Alternators', 'Starters', 'Cooling systems'],
    },
    {
      id: 'diesel',
      status: 'PUBLIC',
      name: 'Diesel and equipment',
      href: 'diesel-repair',
      items: ['Diesel pickups', 'Heavy equipment', 'Construction equipment', 'Ranch equipment', 'Hydraulics'],
    },
    {
      id: 'backcountry',
      status: 'PUBLIC',
      name: 'Backcountry repair',
      href: 'backcountry-repair',
      items: ['Forest Service roads', 'Trailheads', 'Campsites', 'Hunting areas', 'Recovery assistance', 'On-site repairs'],
    },
  ],
  services: [
    { id: 'fleet-maintenance', status: 'PUBLIC', slug: 'fleet-maintenance', name: 'Fleet maintenance', nav: 'Fleet maintenance' },
    { id: 'dot-inspections', status: 'PUBLIC', slug: 'dot-inspections', name: 'DOT inspections', nav: 'DOT inspections' },
    { id: 'mobile-repair', status: 'PUBLIC', slug: 'mobile-repair', name: 'Mobile repair', nav: 'Mobile repair' },
    { id: 'diesel-repair', status: 'PUBLIC', slug: 'diesel-repair', name: 'Diesel repair', nav: 'Diesel repair' },
    { id: 'heavy-equipment-repair', status: 'PUBLIC', slug: 'heavy-equipment-repair', name: 'Heavy equipment repair', nav: 'Heavy equipment' },
    { id: 'backcountry-repair', status: 'PUBLIC', slug: 'backcountry-repair', name: 'Backcountry repair', nav: 'Backcountry' },
  ],
  towns: [
    { id: 'bozeman', status: 'PUBLIC', slug: 'bozeman', name: 'Bozeman', confirm: false, lat: 45.68, lng: -111.04, neighbors: ['belgrade', 'livingston', 'big-sky'] },
    { id: 'belgrade', status: 'PUBLIC', slug: 'belgrade', name: 'Belgrade', confirm: false, lat: 45.78, lng: -111.18, neighbors: ['bozeman', 'manhattan', 'three-forks'] },
    { id: 'big-sky', status: 'PUBLIC', slug: 'big-sky', name: 'Big Sky', confirm: false, lat: 45.28, lng: -111.37, neighbors: ['bozeman', 'west-yellowstone', 'ennis'] },
    { id: 'livingston', status: 'PUBLIC', slug: 'livingston', name: 'Livingston', confirm: false, lat: 45.66, lng: -110.56, neighbors: ['bozeman', 'gardiner', 'big-timber'] },
    { id: 'manhattan', status: 'PUBLIC', slug: 'manhattan', name: 'Manhattan', confirm: false, lat: 45.86, lng: -111.33, neighbors: ['belgrade', 'three-forks', 'bozeman'] },
    { id: 'three-forks', status: 'PUBLIC', slug: 'three-forks', name: 'Three Forks', confirm: false, lat: 45.89, lng: -111.55, neighbors: ['manhattan', 'ennis', 'belgrade'] },
    { id: 'ennis', status: 'PUBLIC', slug: 'ennis', name: 'Ennis', confirm: false, lat: 45.35, lng: -111.73, neighbors: ['three-forks', 'big-sky', 'west-yellowstone'] },
    { id: 'west-yellowstone', status: 'PUBLIC', slug: 'west-yellowstone', name: 'West Yellowstone', confirm: false, lat: 44.66, lng: -111.10, neighbors: ['big-sky', 'ennis', 'gardiner'] },
    { id: 'gardiner', status: 'PUBLIC', slug: 'gardiner', name: 'Gardiner', confirm: false, lat: 45.03, lng: -110.71, neighbors: ['livingston', 'west-yellowstone', 'big-sky'] },
    { id: 'big-timber', status: 'PUBLIC', slug: 'big-timber', name: 'Big Timber', confirm: false, lat: 45.83, lng: -109.96, neighbors: ['livingston', 'bozeman'] },
  ],
  routeOrder: ['west-yellowstone', 'big-sky', 'bozeman', 'belgrade', 'manhattan', 'three-forks', 'ennis', 'gardiner', 'livingston', 'big-timber'],
};

export function liveServices(site = SITE) {
  return site.services.filter((s) => LIVE_STATUSES.has(s.status) && s.slug);
}
export function liveTowns(site = SITE) {
  return site.towns.filter((t) => LIVE_STATUSES.has(t.status) && t.slug);
}
export function liveCategories(site = SITE) {
  return site.categories.filter((c) => LIVE_STATUSES.has(c.status));
}

function lenOk(kind, text, min, max) {
  const n = text.length;
  if (n < min || n > max) throw new Error(`${kind} is ${n} characters: ${text}`);
  return text;
}
export function metaTitle(text) {
  if (text.length > 60) throw new Error(`title ${text.length}: ${text}`);
  return text;
}
export function metaDescription(text) {
  return lenOk('description', text, 110, 160);
}
