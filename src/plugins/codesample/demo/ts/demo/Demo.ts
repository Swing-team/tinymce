/**
 * Demo.js
 *
 * Released under LGPL License.
 * Copyright (c) 1999-2016 Ephox Corp. All rights reserved
 *
 * License: http://www.tinymce.com/license
 * Contributing: http://www.tinymce.com/contributing
 */

declare let tinymce: any;

tinymce.init({
  selector: 'textarea.tinymce',
  theme: 'modern',
  skin_url: '../../../../../js/tinymce/skins/lightgray',
  plugins: 'codesample code',
  toolbar: 'codesample code',
  codesample_content_css: '../../../../../js/tinymce/plugins/codesample/css/prism.css',
  codesample_languages: [
    {text: 'C', value: 'c'},
    {text: 'C#', value: 'csharp'},
    {text: 'C++', value: 'cpp'},
    {text: 'CSS', value: 'css'},
    {text: 'Bash', value: 'bash'},
    {text: 'Docker', value: 'docker'},
    {text: 'Erlang', value: 'erlang'},
    {text: 'Go', value: 'go'},
    {text: 'GraphQL', value: 'graphql'},
    {text: 'HTML/XML', value: 'markup'},
    {text: 'Java', value: 'java'},
    {text: 'JavaScript', value: 'javascript'},
    {text: 'JSON', value: 'json'},
    {text: 'Kotlin', value: 'kotlin'},
    {text: 'Lua', value: 'lua'},
    {text: 'Objective-C', value: 'objectivec'},
    {text: 'Perl', value: 'perl'},
    {text: 'PHP', value: 'php'},
    {text: 'Python', value: 'python'},
    {text: 'Regex', value: 'regex'},
    {text: 'Ruby', value: 'ruby'},
    {text: 'SQL', value: 'sql'},
    {text: 'Swift', value: 'swift'},
    {text: 'TypeScript', value: 'typescript'},
    {text: 'YAML', value: 'yaml'}
  ],
  height: 600
});

tinymce.init({
  selector: 'div.tinymce',
  inline: true,
  theme: 'modern',
  skin_url: '../../../../../js/tinymce/skins/lightgray',
  plugins: 'codesample code',
  toolbar: 'codesample code',
  codesample_content_css: '../../../../../js/tinymce/plugins/codesample/css/prism.css',
  codesample_languages: [
    {text: 'C', value: 'c'},
    {text: 'C#', value: 'csharp'},
    {text: 'C++', value: 'cpp'},
    {text: 'CSS', value: 'css'},
    {text: 'Bash', value: 'bash'},
    {text: 'Docker', value: 'docker'},
    {text: 'Erlang', value: 'erlang'},
    {text: 'Go', value: 'go'},
    {text: 'GraphQL', value: 'graphql'},
    {text: 'HTML/XML', value: 'markup'},
    {text: 'Java', value: 'java'},
    {text: 'JavaScript', value: 'javascript'},
    {text: 'JSON', value: 'json'},
    {text: 'Kotlin', value: 'kotlin'},
    {text: 'Lua', value: 'lua'},
    {text: 'Objective-C', value: 'objectivec'},
    {text: 'Perl', value: 'perl'},
    {text: 'PHP', value: 'php'},
    {text: 'Python', value: 'python'},
    {text: 'Regex', value: 'regex'},
    {text: 'Ruby', value: 'ruby'},
    {text: 'SQL', value: 'sql'},
    {text: 'Swift', value: 'swift'},
    {text: 'TypeScript', value: 'typescript'},
    {text: 'YAML', value: 'yaml'}
  ],
  height: 600
});

export {};
