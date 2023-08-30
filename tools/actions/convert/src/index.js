/*
 * Copyright 2023 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

import fetch from 'node-fetch';
import jsdom from 'jsdom';
import * as WebImporter from '@adobe/helix-importer';
import md2html from './modules/md2html.js';
import { default as transformCfg } from '../../../importer/import.js';
import { mapInbound } from './mapping.js';

export async function render(host, path, params) {
  path = mapInbound(path);

  const { authorization, wcmmode } = params;
  const url = new URL(path, host);
  if (wcmmode) {
    url.searchParams.set('wcmmode', wcmmode);
  }

  const headers = { 'cache-control': 'no-cache'};
  if (authorization) {
    headers['authorization'] = authorization;
  }

  const resp = await fetch(url, { headers });

  if (!resp.ok) {
      return { error: { code: resp.status, message: resp.statusText } }
  }

  const text = await resp.text();
  const { document } = new jsdom.JSDOM(text, { url }).window;
  const md = await WebImporter.html2md(url, document, transformCfg);
  const html = md2html(md, params);
  return { md, html };
}

export async function main(params) {
  const path = params['__ow_path'] ? params['__ow_path'] : '';
  const authorization = params['__ow_headers'] ? params['__ow_headers']['authorization'] : '';

  const { html, error } = await render(params.AEM_AUTHOR, path, { ...params, authorization });
  
  if (!error) {
    return { 
      headers: {
        'x-html2md-img-src': params.AEM_AUTHOR
      },
      statusCode: 200, 
      body: html
    };
  } else {
    return { 
      statusCode: error.code, 
      body: error.message 
    };
  }
}
