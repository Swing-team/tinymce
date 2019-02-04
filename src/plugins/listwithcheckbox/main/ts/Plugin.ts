/**
 * Plugin.js
 *
 * Released under LGPL License.
 * Copyright (c) 1999-2017 Ephox Corp. All rights reserved
 *
 * License: http://www.tinymce.com/license
 * Contributing: http://www.tinymce.com/contributing
 */

import PluginManager from 'tinymce/core/api/PluginManager';
import Api from './api/Api';
import Commands from './api/Commands';
import Keyboard from './core/Keyboard';
import Buttons from './ui/Buttons';

PluginManager.add('listwithcheckbox', function (editor) {
  Keyboard.setup(editor);
  Buttons.register(editor);
  Commands.register(editor);

  // FIXME: Mohammad 10-23-2018: find a better place to put this in
  editor.on('selectionchange', function (e) {
    const root = editor.selection.getNode();
    const rng = editor.selection.getRng();
    if ((root.nodeName === 'LI') && (root.children.length > 0)
      && (root.firstChild.nodeName === 'INPUT')
      && (root.firstChild.type === 'checkbox')
      && (rng.startOffset === 0)
      && editor.selection.isCollapsed()) {
        const newRng = rng.cloneRange();
        newRng.setStartAfter(root.firstChild);
        editor.selection.setRng(newRng);
      }
  });

  return Api.get(editor);
});

export default function () { }