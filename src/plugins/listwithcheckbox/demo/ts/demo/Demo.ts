/**
 * Demo.js
 *
 * Released under LGPL License.
 * Copyright (c) 1999-2017 Ephox Corp. All rights reserved
 *
 * License: http://www.tinymce.com/license
 * Contributing: http://www.tinymce.com/contributing
 */

declare let tinymce: any;

tinymce.init({
  selector: 'textarea.tinymce',
  // content_css: '../../../../../js/tinymce/skins/lightgray/checkbox.css',
  theme: 'modern',
  skin_url: '../../../../../js/tinymce/skins/lightgray',
  plugins: 'listwithcheckbox code',
  toolbar: 'checkbox numlist bullist | outdent indent | code',
  height: 600
});

export {};