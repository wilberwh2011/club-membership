// Layout assertions for the 360px checks (research R8; FR-028, Principle VII).
// Each helper collects every offending element and fails with a readable list.
import { expect, type Page } from '@playwright/test';

export const MIN_TAP_TARGET_PX = 44;
export const MIN_INPUT_FONT_PX = 16;
export const MIN_BODY_FONT_PX = 14;

const INTERACTIVE =
  'a[href], button, input:not([type="hidden"]), select, textarea, summary, [role="button"], [role="link"], [tabindex]:not([tabindex="-1"])';

function viewportWidth(page: Page): number {
  const size = page.viewportSize();
  if (!size) throw new Error('Layout helpers need a fixed viewport');
  return size.width;
}

/** The page never scrolls sideways: scrollWidth ≤ viewport width (360 on the phone project). */
export async function expectNoHorizontalScroll(page: Page, maxWidth = viewportWidth(page)): Promise<void> {
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(scrollWidth, `document scrollWidth ${scrollWidth}px exceeds ${maxWidth}px`).toBeLessThanOrEqual(maxWidth);
}

/** Every visible interactive element is at least 44×44 CSS px. */
export async function expectTapTargets(page: Page, minPx = MIN_TAP_TARGET_PX): Promise<void> {
  const offenders = await page.evaluate(
    ({ selector, min }) => {
      const describe = (el: Element) =>
        `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${el.getAttribute('name') ? `[name=${el.getAttribute('name')}]` : ''}`;
      return Array.from(document.querySelectorAll(selector))
        .filter((el) => {
          const style = getComputedStyle(el);
          const box = el.getBoundingClientRect();
          return style.visibility !== 'hidden' && style.display !== 'none' && box.width > 0 && box.height > 0;
        })
        .map((el) => ({ el, box: el.getBoundingClientRect() }))
        .filter(({ box }) => box.width < min || box.height < min)
        .map(({ el, box }) => `${describe(el)} ${Math.round(box.width)}×${Math.round(box.height)}`);
    },
    { selector: INTERACTIVE, min: minPx },
  );
  expect(offenders, `tap targets smaller than ${minPx}×${minPx}px`).toEqual([]);
}

/** Inputs use ≥ 16px text (no zoom on focus); visible body text is ≥ 14px. */
export async function expectReadableText(
  page: Page,
  { inputPx = MIN_INPUT_FONT_PX, bodyPx = MIN_BODY_FONT_PX } = {},
): Promise<void> {
  const offenders = await page.evaluate(
    ({ inputMin, bodyMin }) => {
      const found: string[] = [];
      const visible = (el: Element) => {
        const style = getComputedStyle(el);
        const box = el.getBoundingClientRect();
        return style.visibility !== 'hidden' && style.display !== 'none' && box.width > 0 && box.height > 0;
      };
      for (const el of Array.from(document.querySelectorAll('input:not([type="hidden"]), select, textarea'))) {
        const size = parseFloat(getComputedStyle(el).fontSize);
        if (visible(el) && size < inputMin) found.push(`${el.tagName.toLowerCase()} font ${size}px`);
      }
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const parent = node.parentElement;
        if (!parent || !node.textContent?.trim() || ['SCRIPT', 'STYLE'].includes(parent.tagName)) continue;
        const size = parseFloat(getComputedStyle(parent).fontSize);
        if (visible(parent) && size < bodyMin) found.push(`${parent.tagName.toLowerCase()} text font ${size}px`);
      }
      return found;
    },
    { inputMin: inputPx, bodyMin: bodyPx },
  );
  expect(offenders, 'text below the minimum readable size').toEqual([]);
}

/** No visible element extends past the left or right edge of the viewport. */
export async function expectNoOverflow(page: Page, maxWidth = viewportWidth(page)): Promise<void> {
  const offenders = await page.evaluate((width) => {
    return Array.from(document.body.querySelectorAll('*'))
      .filter((el) => !['SCRIPT', 'STYLE'].includes(el.tagName))
      .map((el) => ({ el, box: el.getBoundingClientRect(), style: getComputedStyle(el) }))
      .filter(({ box, style }) => style.display !== 'none' && style.visibility !== 'hidden' && box.width > 0)
      .filter(({ box }) => box.left < -0.5 || box.right > width + 0.5)
      .map(({ el, box }) => `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''} spans ${Math.round(box.left)}…${Math.round(box.right)}px`);
  }, maxWidth);
  expect(offenders, `elements overflowing the ${maxWidth}px viewport`).toEqual([]);
}
