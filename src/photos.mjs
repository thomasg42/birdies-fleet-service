// Real licensed stock photography. Source records are not client-job claims.
export const PHOTO_SLOTS = {
 'fleet-maintenance': 'trucks', 'dot-inspections': 'fleet',
 'mobile-repair': 'mechanic', 'diesel-repair': 'pickup',
 'heavy-equipment-repair': 'equipment', 'backcountry-repair': 'road',
 fleet:'trucks',mobile:'mechanic',diesel:'pickup',backcountry:'road',
 about:'forest','service-area':'forest',faq:'forest',privacy:'forest'
};
export function photoFor(ctx, slot = ctx.slug) {
 return ctx.SITE.photos[PHOTO_SLOTS[slot] || (slot.startsWith('service-area/') ? 'forest' : '')] || null;
}
export function stockPhoto(ctx, photo, className = 'section-photo', eager = false) {
 if (!photo) return '';
 return '<figure class="stock-photo '+className+'"><img src="'+ctx.asset(photo.src)+'" alt="'+ctx.esc(photo.alt)+'" width="'+photo.width+'" height="'+photo.height+'" loading="'+(eager?'eager':'lazy')+'" decoding="async"><figcaption><a href="'+ctx.esc(photo.source)+'" target="_blank" rel="noopener noreferrer">Stock photo · '+ctx.esc(photo.credit)+'</a></figcaption></figure>';
}
export function forestPhoto(ctx, backcountry = false) {
 if (backcountry) return '<img class="forest-photo" src="'+ctx.asset('photos/forest-road.webp')+'" alt="" width="1200" height="750" loading="lazy" decoding="async">';
 return '<picture class="forest-photo"><source media="(max-width: 600px)" srcset="'+ctx.asset('photos/forest-hero-mobile.webp')+'"><img src="'+ctx.asset('photos/forest-hero.webp')+'" alt="" width="1600" height="1000" fetchpriority="high" decoding="async"></picture>';
}
