import {
  sampleRUM,
  buildBlock,
  loadHeader,
  loadFooter,
  decorateButtons,
  decorateIcons,
  decorateSections,
  decorateBlocks,
  decorateTemplateAndTheme,
  waitForLCP,
  loadBlocks,
  loadCSS,
  toClassName,
  getMetadata,
} from './lib-franklin.js';

const LCP_BLOCKS = ['breadcrumb']; // add your LCP blocks to the list
const TEMPLATE_LIST = {
  blog: 'blog',
  news: 'blog',
};

/**
 * Format date expressed in UTC seconds
 * @param {number} date
 * @returns new string with the formatted date
 */
export function formatDateUTCSeconds(date, options = {}) {
  const dateObj = new Date(0);
  dateObj.setUTCSeconds(date);

  return dateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    ...options,
  });
}

/**
 * Returns the valid public url with or without .html extension
 * @param {string} url
 * @returns new string with the formatted url
 */
export function makePublicUrl(url) {
  const isProd = window.location.hostname.includes('lifesciences.danaher.com');
  try {
    const newURL = new URL(url);
    if (isProd) {
      if (newURL.pathname.endsWith('.html')) {
        return newURL.toString();
      }
      newURL.pathname += '.html';
      return newURL.toString();
    }
    if (newURL.pathname.endsWith('.html')) {
      newURL.pathname = newURL.pathname.slice(0, -5);
      return newURL.toString();
    }
    return newURL.toString();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Invalid URL:', error);
    return url;
  }
}

/**
 * Builds hero block and prepends to main in a new section.
 * @param {Element} main The container element
 */
function buildHeroBlock(main) {
  const h1 = main.querySelector('h1');
  const picture = main.querySelector('picture');
  // eslint-disable-next-line no-bitwise
  if (h1 && picture && (h1.compareDocumentPosition(picture) & Node.DOCUMENT_POSITION_PRECEDING)) {
    const section = document.createElement('div');
    section.append(buildBlock('hero', { elems: [picture, h1] }));
    main.prepend(section);
  }
}

function buildVideo(main) {
  main.querySelectorAll('a[href*="youtube.com"],a[href*="vimeo.com"]').forEach((link) => {
    if (link.closest('.block.embed') === null) {
      link.parentElement.replaceWith(buildBlock('embed', { elems: [link] }));
      // const observer = new IntersectionObserver((entries) => {
      //   if (entries.some((e) => e.isIntersecting)) {
      //     observer.disconnect();
      //     const [, , video] = link.pathname.split('/');
      //     const playerURL = link.href.indexOf('youtube') > -1 ? 'https://www.youtube.com/embed/' : 'https://player.vimeo.com/video/';
      //     const embedHTML = `<div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%;">
      //         <iframe src="${playerURL}${video}" 
      //         style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute;" 
      //         frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen  
      //         title="Video Player" loading="lazy"></iframe>
      //       </div>`;
      //     link.parentElement.innerHTML = embedHTML;
      //   }
      // });
      // observer.observe(link.parentElement);
    }
  });
}

/**
 * load fonts.css and set a session storage flag
 */
async function loadFonts() {
  await loadCSS(`${window.hlx.codeBasePath}/styles/fonts.css`);
  try {
    if (!window.location.hostname.includes('localhost')) sessionStorage.setItem('fonts-loaded', 'true');
  } catch (e) {
    // do nothing
  }
}

/**
 * Builds all synthetic blocks in a container element.
 * @param {Element} main The container element
 */
function buildAutoBlocks(main) {
  try {
    buildHeroBlock(main);
    buildVideo(main);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Auto Blocking failed', error);
  }
}

/**
 * Decorates the main element.
 * @param {Element} main The main element
 */
// eslint-disable-next-line import/prefer-default-export
export function decorateMain(main) {
  // hopefully forward compatible button decoration
  decorateButtons(main);
  decorateIcons(main);
  buildAutoBlocks(main);
  decorateSections(main);
  decorateBlocks(main);
}

/**
 * Run template specific decoration code.
 * @param {Element} main The container element
 */
async function decorateTemplates(main) {
  try {
    const template = toClassName(getMetadata('template'));
    const templates = Object.keys(TEMPLATE_LIST);
    if (templates.includes(template)) {
      const templateName = TEMPLATE_LIST[template];
      const mod = await import(`../templates/${templateName}/${templateName}.js`);
      if (mod.default) {
        await mod.default(main);
      }
      document.body.classList.add(templateName);
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Auto Blocking failed', error);
  }
}

/**
 * Loads everything needed to get to LCP.
 * @param {Element} doc The container element
 */
async function loadEager(doc) {
  document.documentElement.lang = 'en';
  decorateTemplateAndTheme();
  const main = doc.querySelector('main');
  if (main) {
    await decorateTemplates(main);
    decorateMain(main);
    document.body.classList.add('block');
    await waitForLCP(LCP_BLOCKS);
  }

  try {
    /* if desktop (proxy for fast connection) or fonts already loaded, load fonts.css */
    if (window.innerWidth >= 900 || sessionStorage.getItem('fonts-loaded')) {
      loadFonts();
    }
  } catch (e) {
    // do nothing
  }
}

// UTM Paramaters check - start
function getParameterByName(parameter, url = window.location.href) {
  /* eslint-disable no-eval */
  const modifiedParameter = parameter.replace(/[[\]]/g, '$&');
  const regex = new RegExp(`[?&]${modifiedParameter}(=([^&#]*)|&|#|$)`);
  const results = regex.exec(url);
  if (!results) return null;
  if (!results[2]) return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

function loadUTMprams() {
  /* eslint-disable no-eval */
  const utmParameters = [
    'utm_campaign',
    'utm_source',
    'utm_medium',
    'utm_content',
    'utm_term',
    'utm_previouspage',
  ];

  utmParameters.forEach((param) => {
    const value = getParameterByName(param);
    if (value !== null) {
      window.localStorage.setItem(`danaher_${param}`, value);
    }
  });
}
// UTM Paramaters check - end

/**
 * Loads everything that doesn't need to be delayed.
 * @param {Element} doc The container element
 */
async function loadLazy(doc) {
  const main = doc.querySelector('main');
  await loadBlocks(main);

  const { hash } = window.location;
  const element = hash ? doc.getElementById(hash.substring(1)) : false;
  if (hash && element) element.scrollIntoView();

  loadHeader(doc.querySelector('header'));
  loadFooter(doc.querySelector('footer'));

  loadCSS(`${window.hlx.codeBasePath}/styles/lazy-styles.css`);
  loadFonts();

  sampleRUM('lazy');
  sampleRUM.observe(main.querySelectorAll('div[data-block-name]'));
  sampleRUM.observe(main.querySelectorAll('picture > img'));

  loadUTMprams();
}

/**
 * Loads everything that happens a lot later,
 * without impacting the user experience.
 */
function loadDelayed() {
  // eslint-disable-next-line import/no-cycle
  window.setTimeout(() => import('./delayed.js'), 3000);
  // load anything that can be postponed to the latest here
}

/**
 * Get a cookie
 * @param cname the name of the cookie
 */
export function getCookie(cname) {
  let value = decodeURIComponent(
    // eslint-disable-next-line prefer-template
    document.cookie.replace(new RegExp('(?:(?:^|.*;)\\s*' + encodeURIComponent(cname).replace(/[\\-\\.\\+\\*]/g, '\\$&') + '\\s*\\=\\s*([^;]*).*$)|^.*$'), '$1'),
  ) || null;
  if (value && ((value.substring(0, 1) === '{' && value.substring(value.length - 1, value.length) === '}') || (value.substring(0, 1) === '[' && value.substring(value.length - 1, value.length) === ']'))) {
    try {
      value = JSON.parse(value);
    } catch (e) {
      return value;
    }
  }
  return value;
}

/**
* Set the content of a cookie
* @param {string} cname The cookie name (or property)
* @param {string} cvalue The cookie value
* @param {number} expTime The cookie expiry time (default 30 days)
* @param {string} path The cookie path (optional)
*
*/
export function setCookie(cname, cvalue, expTime = 30 * 1000 * 60 * 60 * 24, path = '/') {
  const today = new Date();
  today.setTime(today.getTime() + (expTime));
  const expires = 'expires='.concat(today.toGMTString());
  const cookieString = cname.concat('=')
    .concat(cvalue)
    .concat(';')
    .concat(expires)
    .concat(';path=')
    .concat(path);
  document.cookie = cookieString; // cname + '=' + cvalue + ';' + expires + ';path=' + path;
}

/**
 * Returns the user logged in state based cookie
 */
export function isLoggedInUser() {
  return getCookie('rationalized_id');
}

/**
 * Returns the user authorization used for commerce API calls
 */
export function getAuthorization() {
  const authHeader = new Headers();
  if (localStorage.getItem('authToken')) {
    authHeader.append('Authorization', `Bearer ${localStorage.getItem('authToken')}`);
  } else if (getCookie('ProfileData')) {
    const { customer_token: apiToken } = getCookie('ProfileData');
    authHeader.append('authentication-token', apiToken);
  } else if (getCookie('apiToken')) {
    const apiToken = getCookie('apiToken');
    authHeader.append('authentication-token', apiToken);
  }
  return authHeader;
}

async function loadPage() {
  await loadEager(document);
  await loadLazy(document);
  loadDelayed();
}

// Danaher Config - Start
if (window.location.host === 'lifesciences.danaher.com') {
  window.DanaherConfig = {
    siteID: 'ls-us-en',
    gtmID: 'GTM-THXPLCS',
    munchkinID: '306-EHG-641',
    marketoDomain: '//306-EHG-641.mktoweb.com',
    quoteCartPath: '/us/en/quote-cart.html',
    cartPath: '/us/en/cart.html',
    addressesPath: '/us/en/addresses.html',
    shippingPath: '/us/en/shipping.html',
    paymentPath: '/us/en/payment.html',
    receiptPath: '/us/en/receipt.html',
    quoteSubmitPath: '/us/en/submit-quote.html',
    intershopDomain: 'https://shop.lifesciences.danaher.com',
    intershopPath: '/INTERSHOP/rest/WFS/DANAHERLS-LSIG-Site/-',
    searchOrg: 'danaherproductionrfl96bkr',
    searchKey: 'xxf2f10385-5a54-4a18-bb48-fd8025d6b5d2',
    workflowProductKey: 'xx3d1b8da5-d1e9-4989-bbed-264a248a9e22',
    workflowResourceKey: 'xxf6a8b387-10f2-4660-af5d-6d304d0a789d',
    productKey: 'xxfb161aa6-0fa0-419f-af37-9c6d7784bf76',
    familyProductKey: 'xx1ecd2a4f-8391-4c70-b3c0-2d589bda56b7',
    familyResourceKey: 'xx9dd85afc-64b6-4295-bc5d-eb8285f96d52',
    categoryProductKey: 'xx2a299d60-2cf1-48ab-b9d5-94daeb25f1d6',
    categoryDetailKey: 'xx61910369-c1ab-4df9-8d8a-3092b1323fcc',
    megaMenuPath: '/content/dam/danaher/system/navigation/megamenu_items_us.json',
    coveoProductPageTitle: 'Product Page',
  };
} else {
  window.DanaherConfig = {
    siteID: 'ls-us-en',
    gtmID: 'GTM-KCBGM2N',
    munchkinID: '439-KNJ-322',
    marketoDomain: '//439-KNJ-322.mktoweb.com',
    quoteCartPath: '/us/en/quote-cart.html',
    cartPath: '/us/en/cart.html',
    addressesPath: '/us/en/addresses.html',
    shippingPath: '/us/en/shipping.html',
    paymentPath: '/us/en/payment.html',
    receiptPath: '/us/en/receipt.html',
    quoteSubmitPath: '/us/en/submit-quote.html',
    intershopDomain: 'https://stage.shop.lifesciences.danaher.com',
    intershopPath: '/INTERSHOP/rest/WFS/DANAHERLS-LSIG-Site/-',
    searchOrg: 'danahernonproduction1892f3fhz',
    searchKey: 'xx2a2e7271-78c3-4e3b-bac3-2fcbab75323b',
    workflowProductKey: 'xx26ffc727-cc72-4bbd-98e3-34052f296382',
    workflowResourceKey: 'xx14676f1d-cf4a-4a38-94f0-eda56e9920f1',
    productKey: 'xx32da148e-dfd0-4725-a443-c05a7793afea',
    familyProductKey: 'xx4e3989d6-93aa-4140-a227-19da35fcd1cc',
    familyResourceKey: 'xx8274a91e-b29c-4267-8b3a-5022a2698605',
    categoryProductKey: 'xxdf9d160d-f6e5-4c8c-969b-8570d7b81418',
    categoryDetailKey: 'xxf2ea9bfd-bccb-4195-90fd-7757504fdc33',
    megaMenuPath: '/content/dam/danaher/system/navigation/megamenu_items_us.json',
    coveoProductPageTitle: 'Product Page',
  };
}
// Danaher Config - End

// Datalayer Init - Start
window.dataLayer = [];
window.dataLayer.push({
  user: {
    customerID: '',
    accountType: 'guest',
    marketCode: '',
    company: '',
    role: '',
    city: '',
    state: '',
    country: '',
    postalCode: '',
    lastVisit: '',
  },
});
window.dataLayer.push({
  page: {
    title: 'Danaher Life Sciences | Drug Discovery & Development Solutions',
    language: 'en',
    locale: 'US',
    level: 'top',
    type: 'webpage',
    keywords: '',
    creationDate: 'Dec 09, 2022 01:22:30 PM',
    updateDate: 'Jul 25, 2023 02:07:20 PM',
  },
});
// Datalayer Init - End

loadPage();
