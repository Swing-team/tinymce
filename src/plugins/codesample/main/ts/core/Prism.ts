/**
 * Prism.js
 *
 * Released under LGPL License.
 * Copyright (c) 1999-2017 Ephox Corp. All rights reserved
 *
 * License: http://www.tinymce.com/license
 * Contributing: http://www.tinymce.com/contributing
 *
 * Import of prism. Disabled DOMContentLoaded event listener.
 */

import { self, document, Worker } from '@ephox/dom-globals';

/*eslint-disable*/

/*eslint-enable */

declare const WorkerGlobalScope: any;

const window: any = {};
const global: any = window;
const module: any = { exports: {} };

// ------------------ Start wrap

/* http://prismjs.com/download.html?themes=prism-dark&languages=markup+css+clike+javascript+c+csharp+cpp+java+php+python+ruby */
const _self: any = (typeof window !== 'undefined')
  ? window   // if in browser
  : (
    (typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope)
      ? self // if in worker
      : {}   // if in node js
  );

/**
 * Prism: Lightweight, robust, elegant syntax highlighting
 * MIT license http://www.opensource.org/licenses/mit-license.php/
 * @author Lea Verou http://lea.verou.me
 */

const Prism = (function () {

  // Private helper vars
  const lang = /\blang(?:uage)?-(?!\*)(\w+)\b/i;

  const _: any = _self.Prism = {
    util: {
      encode (tokens) {
        if (tokens instanceof Token) {
          return new Token(tokens.type, _.util.encode(tokens.content), tokens.alias);
        } else if (_.util.type(tokens) === 'Array') {
          return tokens.map(_.util.encode);
        } else {
          return tokens.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\u00a0/g, ' ');
        }
      },

      type (o) {
        return Object.prototype.toString.call(o).match(/\[object (\w+)\]/)[1];
      },

      // Deep clone a language definition (e.g. to extend it)
      clone (o) {
        const type = _.util.type(o);

        switch (type) {
          case 'Object':
            const clone = {};

            for (const key in o) {
              if (o.hasOwnProperty(key)) {
                clone[key] = _.util.clone(o[key]);
              }
            }

            return clone;

          case 'Array':
            // Check for existence for IE8
            return o.map && o.map(function (v) { return _.util.clone(v); });
        }

        return o;
      }
    },

    languages: {
      extend (id, redef) {
        const lang = _.util.clone(_.languages[id]);

        for (const key in redef) {
          lang[key] = redef[key];
        }

        return lang;
      },

      /**
       * Insert a token before another token in a language literal
       * As this needs to recreate the object (we cannot actually insert before keys in object literals),
       * we cannot just provide an object, we need anobject and a key.
       * @param inside The key (or language id) of the parent
       * @param before The key to insert before. If not provided, the function appends instead.
       * @param insert Object with the key/value pairs to insert
       * @param root The object that contains `inside`. If equal to Prism.languages, it can be omitted.
       */
      insertBefore (inside, before, insert, root) {
        root = root || _.languages;
        const grammar = root[inside];

        if (arguments.length === 2) {
          insert = arguments[1];

          for (const newToken in insert) {
            if (insert.hasOwnProperty(newToken)) {
              grammar[newToken] = insert[newToken];
            }
          }

          return grammar;
        }

        const ret = {};

        for (const token in grammar) {

          if (grammar.hasOwnProperty(token)) {

            if (token === before) {

              for (const newToken in insert) {

                if (insert.hasOwnProperty(newToken)) {
                  ret[newToken] = insert[newToken];
                }
              }
            }

            ret[token] = grammar[token];
          }
        }

        // Update references in other language definitions
        _.languages.DFS(_.languages, function (key, value) {
          if (value === root[inside] && key !== inside) {
            this[key] = ret;
          }
        });

        return root[inside] = ret;
      },

      // Traverse a language definition with Depth First Search
      DFS: <any> function (o, callback, type) {
        for (const i in o) {
          if (o.hasOwnProperty(i)) {
            callback.call(o, i, o[i], type || i);

            if (_.util.type(o[i]) === 'Object') {
              _.languages.DFS(o[i], callback);
            } else if (_.util.type(o[i]) === 'Array') {
              _.languages.DFS(o[i], callback, i);
            }
          }
        }
      }
    },
    plugins: {},

    highlightAll (async, callback) {
      const elements = document.querySelectorAll('code[class*="language-"], [class*="language-"] code, code[class*="lang-"], [class*="lang-"] code');

      for (let i = 0, element; element = elements[i++];) {
        _.highlightElement(element, async === true, callback);
      }
    },

    highlightElement (element, async, callback) {
      // Find language
      let language, grammar, parent = element;

      while (parent && !lang.test(parent.className)) {
        parent = parent.parentNode;
      }

      if (parent) {
        language = (parent.className.match(lang) || [, ''])[1];
        grammar = _.languages[language];
      }

      // Set language on the element, if not present
      element.className = element.className.replace(lang, '').replace(/\s+/g, ' ') + ' language-' + language;

      // Set language on the parent, for styling
      parent = element.parentNode;

      if (/pre/i.test(parent.nodeName)) {
        parent.className = parent.className.replace(lang, '').replace(/\s+/g, ' ') + ' language-' + language;
      }

      const code = element.textContent;

      const env: any = {
        element,
        language,
        grammar,
        code
      };

      if (!code || !grammar) {
        _.hooks.run('complete', env);
        return;
      }

      _.hooks.run('before-highlight', env);

      if (async && _self.Worker) {
        const worker = new Worker(_.filename);

        worker.onmessage = function (evt) {
          env.highlightedCode = evt.data;

          _.hooks.run('before-insert', env);

          env.element.innerHTML = env.highlightedCode;

          if (callback) {
            callback.call(env.element);
          }
          _.hooks.run('after-highlight', env);
          _.hooks.run('complete', env);
        };

        worker.postMessage(JSON.stringify({
          language: env.language,
          code: env.code,
          immediateClose: true
        }));
      } else {
        env.highlightedCode = _.highlight(env.code, env.grammar, env.language);

        _.hooks.run('before-insert', env);

        env.element.innerHTML = env.highlightedCode;

        if (callback) {
          callback.call(element);
        }

        _.hooks.run('after-highlight', env);
        _.hooks.run('complete', env);
      }
    },

    highlight (text, grammar, language) {
      const tokens = _.tokenize(text, grammar);
      return Token.stringify(_.util.encode(tokens), language);
    },

    tokenize (text, grammar, language) {
      const Token = _.Token;

      const strarr = [text];

      const rest = grammar.rest;

      if (rest) {
        for (const token in rest) {
          grammar[token] = rest[token];
        }

        delete grammar.rest;
      }

      tokenloop: for (const token in grammar) {
        if (!grammar.hasOwnProperty(token) || !grammar[token]) {
          continue;
        }

        let patterns = grammar[token];
        patterns = (_.util.type(patterns) === 'Array') ? patterns : [patterns];

        for (let j = 0; j < patterns.length; ++j) {
          let pattern = patterns[j];
          const inside = pattern.inside;
          const lookbehind = !!pattern.lookbehind;
          let lookbehindLength = 0;
          const alias = pattern.alias;

          pattern = pattern.pattern || pattern;

          for (let i = 0; i < strarr.length; i++) { // Don’t cache length as it changes during the loop

            const str = strarr[i];

            if (strarr.length > text.length) {
              // Something went terribly wrong, ABORT, ABORT!
              break tokenloop;
            }

            if (str instanceof Token) {
              continue;
            }

            pattern.lastIndex = 0;

            let match = pattern.exec(str);

            if (match) {
              if (lookbehind) {
                lookbehindLength = match[1].length;
              }

              const from = match.index - 1 + lookbehindLength;
              match = match[0].slice(lookbehindLength);
              const len = match.length,
                to = from + len,
                before = str.slice(0, from + 1),
                after = str.slice(to + 1);

              const args = [i, 1];

              if (before) {
                args.push(before);
              }

              const wrapped = new Token(token, inside ? _.tokenize(match, inside) : match, alias);

              args.push(wrapped);

              if (after) {
                args.push(after);
              }

              Array.prototype.splice.apply(strarr, args);
            }
          }
        }
      }

      return strarr;
    },

    hooks: {
      all: {},

      add (name, callback) {
        const hooks = _.hooks.all;

        hooks[name] = hooks[name] || [];

        hooks[name].push(callback);
      },

      run (name, env) {
        const callbacks = _.hooks.all[name];

        if (!callbacks || !callbacks.length) {
          return;
        }

        for (let i = 0, callback; callback = callbacks[i++];) {
          callback(env);
        }
      }
    }
  };

  const Token: any = _.Token = function (type, content, alias) {
    this.type = type;
    this.content = content;
    this.alias = alias;
  };

  Token.stringify = function (o, language, parent) {
    if (typeof o === 'string') {
      return o;
    }

    if (_.util.type(o) === 'Array') {
      return o.map(function (element) {
        return Token.stringify(element, language, o);
      }).join('');
    }

    const env: any = {
      type: o.type,
      content: Token.stringify(o.content, language, parent),
      tag: 'span',
      classes: ['token', o.type],
      attributes: {},
      language,
      parent
    };

    if (env.type === 'comment') {
      env.attributes.spellcheck = 'true';
    }

    if (o.alias) {
      const aliases = _.util.type(o.alias) === 'Array' ? o.alias : [o.alias];
      Array.prototype.push.apply(env.classes, aliases);
    }

    _.hooks.run('wrap', env);

    let attributes = '';

    for (const name in env.attributes) {
      attributes += (attributes ? ' ' : '') + name + '="' + (env.attributes[name] || '') + '"';
    }

    return '<' + env.tag + ' class="' + env.classes.join(' ') + '" ' + attributes + '>' + env.content + '</' + env.tag + '>';

  };

  if (!_self.document) {
    if (!_self.addEventListener) {
      // in Node.js
      return _self.Prism;
    }
    // In worker
    _self.addEventListener('message', function (evt) {
      const message = JSON.parse(evt.data),
        lang = message.language,
        code = message.code,
        immediateClose = message.immediateClose;

      _self.postMessage(_.highlight(code, _.languages[lang], lang));
      if (immediateClose) {
        _self.close();
      }
    }, false);

    return _self.Prism;
  }
  /*
  // Get current script and highlight
  var script = document.getElementsByTagName('script');

  script = script[script.length - 1];

  if (script) {
    _.filename = script.src;

    if (document.addEventListener && !script.hasAttribute('data-manual')) {
      document.addEventListener('DOMContentLoaded', _.highlightAll);
    }
  }

  return _self.Prism;
  */
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Prism;
}

// hack for components to work correctly in node.js
if (typeof global !== 'undefined') {
  global.Prism = Prism;
}
Prism.languages.markup = {
  comment: /<!--[\w\W]*?-->/,
  prolog: /<\?[\w\W]+?\?>/,
  doctype: /<!DOCTYPE[\w\W]+?>/,
  cdata: /<!\[CDATA\[[\w\W]*?]]>/i,
  tag: {
    pattern: /<\/?[^\s>\/=.]+(?:\s+[^\s>\/=]+(?:=(?:("|')(?:\\\1|\\?(?!\1)[\w\W])*\1|[^\s'">=]+))?)*\s*\/?>/i,
    inside: {
      'tag': {
        pattern: /^<\/?[^\s>\/]+/i,
        inside: {
          punctuation: /^<\/?/,
          namespace: /^[^\s>\/:]+:/
        }
      },
      'attr-value': {
        pattern: /=(?:('|")[\w\W]*?(\1)|[^\s>]+)/i,
        inside: {
          punctuation: /[=>"']/
        }
      },
      'punctuation': /\/?>/,
      'attr-name': {
        pattern: /[^\s>\/]+/,
        inside: {
          namespace: /^[^\s>\/:]+:/
        }
      }

    }
  },
  entity: /&#?[\da-z]{1,8};/i
};

// Plugin to make entity title show the real entity, idea by Roman Komarov
Prism.hooks.add('wrap', function (env) {

  if (env.type === 'entity') {
    env.attributes.title = env.content.replace(/&amp;/, '&');
  }
});

Prism.languages.xml = Prism.languages.markup;
Prism.languages.html = Prism.languages.markup;
Prism.languages.mathml = Prism.languages.markup;
Prism.languages.svg = Prism.languages.markup;

Prism.languages.css = {
  comment: /\/\*[\w\W]*?\*\//,
  atrule: {
    pattern: /@[\w-]+?.*?(;|(?=\s*\{))/i,
    inside: {
      rule: /@[\w-]+/
      // See rest below
    }
  },
  url: /url\((?:(["'])(\\(?:\r\n|[\w\W])|(?!\1)[^\\\r\n])*\1|.*?)\)/i,
  selector: /[^\{\}\s][^\{\};]*?(?=\s*\{)/,
  string: /("|')(\\(?:\r\n|[\w\W])|(?!\1)[^\\\r\n])*\1/,
  property: /(\b|\B)[\w-]+(?=\s*:)/i,
  important: /\B!important\b/i,
  function: /[-a-z0-9]+(?=\()/i,
  punctuation: /[(){};:]/
};

Prism.languages.css.atrule.inside.rest = Prism.util.clone(Prism.languages.css);

if (Prism.languages.markup) {
  Prism.languages.insertBefore('markup', 'tag', {
    style: {
      pattern: /<style[\w\W]*?>[\w\W]*?<\/style>/i,
      inside: {
        tag: {
          pattern: /<style[\w\W]*?>|<\/style>/i,
          inside: Prism.languages.markup.tag.inside
        },
        rest: Prism.languages.css
      },
      alias: 'language-css'
    }
  });

  Prism.languages.insertBefore('inside', 'attr-value', {
    'style-attr': {
      pattern: /\s*style=("|').*?\1/i,
      inside: {
        'attr-name': {
          pattern: /^\s*style/i,
          inside: Prism.languages.markup.tag.inside
        },
        'punctuation': /^\s*=\s*['"]|['"]\s*$/,
        'attr-value': {
          pattern: /.+/i,
          inside: Prism.languages.css
        }
      },
      alias: 'language-css'
    }
  }, Prism.languages.markup.tag);
}
Prism.languages.clike = {
  'comment': [
    {
      pattern: /(^|[^\\])\/\*[\w\W]*?\*\//,
      lookbehind: true
    },
    {
      pattern: /(^|[^\\:])\/\/.*/,
      lookbehind: true
    }
  ],
  'string': /(["'])(\\(?:\r\n|[\s\S])|(?!\1)[^\\\r\n])*\1/,
  'class-name': {
    pattern: /((?:\b(?:class|interface|extends|implements|trait|instanceof|new)\s+)|(?:catch\s+\())[a-z0-9_\.\\]+/i,
    lookbehind: true,
    inside: {
      punctuation: /(\.|\\)/
    }
  },
  'keyword': /\b(if|else|while|do|for|return|in|instanceof|function|new|try|throw|catch|finally|null|break|continue)\b/,
  'boolean': /\b(true|false)\b/,
  'function': /[a-z0-9_]+(?=\()/i,
  'number': /\b-?(?:0x[\da-f]+|\d*\.?\d+(?:e[+-]?\d+)?)\b/i,
  'operator': /--?|\+\+?|!=?=?|<=?|>=?|==?=?|&&?|\|\|?|\?|\*|\/|~|\^|%/,
  'punctuation': /[{}[\];(),.:]/
};

Prism.languages.javascript = Prism.languages.extend('clike', {
  keyword: /\b(as|async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|false|finally|for|from|function|get|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|set|static|super|switch|this|throw|true|try|typeof|var|void|while|with|yield)\b/,
  number: /\b-?(0x[\dA-Fa-f]+|0b[01]+|0o[0-7]+|\d*\.?\d+([Ee][+-]?\d+)?|NaN|Infinity)\b/,
  // Allow for all non-ASCII characters (See http://stackoverflow.com/a/2008444)
  function: /[_$a-zA-Z\xA0-\uFFFF][_$a-zA-Z0-9\xA0-\uFFFF]*(?=\()/i
});

Prism.languages.insertBefore('javascript', 'keyword', {
  regex: {
    pattern: /(^|[^/])\/(?!\/)(\[.+?]|\\.|[^/\\\r\n])+\/[gimyu]{0,5}(?=\s*($|[\r\n,.;})]))/,
    lookbehind: true
  }
});

Prism.languages.insertBefore('javascript', 'class-name', {
  'template-string': {
    pattern: /`(?:\\`|\\?[^`])*`/,
    inside: {
      interpolation: {
        pattern: /\$\{[^}]+\}/,
        inside: {
          'interpolation-punctuation': {
            pattern: /^\$\{|\}$/,
            alias: 'punctuation'
          },
          'rest': Prism.languages.javascript
        }
      },
      string: /[\s\S]+/
    }
  }
});

if (Prism.languages.markup) {
  Prism.languages.insertBefore('markup', 'tag', {
    script: {
      pattern: /<script[\w\W]*?>[\w\W]*?<\/script>/i,
      inside: {
        tag: {
          pattern: /<script[\w\W]*?>|<\/script>/i,
          inside: Prism.languages.markup.tag.inside
        },
        rest: Prism.languages.javascript
      },
      alias: 'language-javascript'
    }
  });
}

Prism.languages.js = Prism.languages.javascript;
Prism.languages.c = Prism.languages.extend('clike', {
  keyword: /\b(asm|typeof|inline|auto|break|case|char|const|continue|default|do|double|else|enum|extern|float|for|goto|if|int|long|register|return|short|signed|sizeof|static|struct|switch|typedef|union|unsigned|void|volatile|while)\b/,
  operator: /\-[>-]?|\+\+?|!=?|<<?=?|>>?=?|==?|&&?|\|?\||[~^%?*\/]/,
  number: /\b-?(?:0x[\da-f]+|\d*\.?\d+(?:e[+-]?\d+)?)[ful]*\b/i
});

Prism.languages.insertBefore('c', 'string', {
  macro: {
    // allow for multiline macro definitions
    // spaces after the # character compile fine with gcc
    pattern: /(^\s*)#\s*[a-z]+([^\r\n\\]|\\.|\\(?:\r\n?|\n))*/im,
    lookbehind: true,
    alias: 'property',
    inside: {
      // highlight the path of the include statement as a string
      string: {
        pattern: /(#\s*include\s*)(<.+?>|("|')(\\?.)+?\3)/,
        lookbehind: true
      }
    }
  }
});

delete Prism.languages.c['class-name'];
delete Prism.languages.c.boolean;

Prism.languages.csharp = Prism.languages.extend('clike', {
  'keyword': /\b(?:abstract|add|alias|as|ascending|async|await|base|bool|break|byte|case|catch|char|checked|class|const|continue|decimal|default|delegate|descending|do|double|dynamic|else|enum|event|explicit|extern|false|finally|fixed|float|for|foreach|from|get|global|goto|group|if|implicit|in|int|interface|internal|into|is|join|let|lock|long|namespace|new|null|object|operator|orderby|out|override|params|partial|private|protected|public|readonly|ref|remove|return|sbyte|sealed|select|set|short|sizeof|stackalloc|static|string|struct|switch|this|throw|true|try|typeof|uint|ulong|unchecked|unsafe|ushort|using|value|var|virtual|void|volatile|where|while|yield)\b/,
  'string': [
    {
      pattern: /@("|')(?:\1\1|\\[\s\S]|(?!\1)[^\\])*\1/,
      greedy: true
    },
    {
      pattern: /("|')(?:\\.|(?!\1)[^\\\r\n])*?\1/,
      greedy: true
    }
  ],
  'class-name': [
    {
      // (Foo bar, Bar baz)
      pattern: /\b[A-Z]\w*(?:\.\w+)*\b(?=\s+\w+)/,
      inside: {
        punctuation: /\./
      }
    },
    {
      // [Foo]
      pattern: /(\[)[A-Z]\w*(?:\.\w+)*\b/,
      lookbehind: true,
      inside: {
        punctuation: /\./
      }
    },
    {
      // class Foo : Bar
      pattern: /(\b(?:class|interface)\s+[A-Z]\w*(?:\.\w+)*\s*:\s*)[A-Z]\w*(?:\.\w+)*\b/,
      lookbehind: true,
      inside: {
        punctuation: /\./
      }
    },
    {
      // class Foo
      pattern: /((?:\b(?:class|interface|new)\s+)|(?:catch\s+\())[A-Z]\w*(?:\.\w+)*\b/,
      lookbehind: true,
      inside: {
        punctuation: /\./
      }
    }
  ],
  'number': /\b0x[\da-f]+\b|(?:\b\d+\.?\d*|\B\.\d+)f?/i,
  'operator': />>=?|<<=?|[-=]>|([-+&|?])\1|~|[-+*/%&|^!=<>]=?/,
  'punctuation': /\?\.?|::|[{}[\];(),.:]/
});

Prism.languages.insertBefore('csharp', 'class-name', {
  'generic-method': {
    pattern: /\w+\s*<[^>\r\n]+?>\s*(?=\()/,
    inside: {
      'function': /^\w+/,
      'class-name': {
        pattern: /\b[A-Z]\w*(?:\.\w+)*\b/,
        inside: {
          punctuation: /\./
        }
      },
      'keyword': Prism.languages.csharp.keyword,
      'punctuation': /[<>(),.:]/
    }
  },
  'preprocessor': {
    pattern: /(^\s*)#.*/m,
    lookbehind: true,
    alias: 'property',
    inside: {
      // highlight preprocessor directives as keywords
      directive: {
        pattern: /(\s*#)\b(?:define|elif|else|endif|endregion|error|if|line|pragma|region|undef|warning)\b/,
        lookbehind: true,
        alias: 'keyword'
      }
    }
  }
});

Prism.languages.dotnet = Prism.languages.csharp;

Prism.languages.cpp = Prism.languages.extend('c', {
  keyword: /\b(alignas|alignof|asm|auto|bool|break|case|catch|char|char16_t|char32_t|class|compl|const|constexpr|const_cast|continue|decltype|default|delete|do|double|dynamic_cast|else|enum|explicit|export|extern|float|for|friend|goto|if|inline|int|long|mutable|namespace|new|noexcept|nullptr|operator|private|protected|public|register|reinterpret_cast|return|short|signed|sizeof|static|static_assert|static_cast|struct|switch|template|this|thread_local|throw|try|typedef|typeid|typename|union|unsigned|using|virtual|void|volatile|wchar_t|while)\b/,
  boolean: /\b(true|false)\b/,
  operator: /[-+]{1,2}|!=?|<{1,2}=?|>{1,2}=?|\->|:{1,2}|={1,2}|\^|~|%|&{1,2}|\|?\||\?|\*|\/|\b(and|and_eq|bitand|bitor|not|not_eq|or|or_eq|xor|xor_eq)\b/
});

Prism.languages.insertBefore('cpp', 'keyword', {
  'class-name': {
    pattern: /(class\s+)[a-z0-9_]+/i,
    lookbehind: true
  }
});
(function (Prism) {

  const keywords = /\b(?:abstract|continue|for|new|switch|assert|default|goto|package|synchronized|boolean|do|if|private|this|break|double|implements|protected|throw|byte|else|import|public|throws|case|enum|instanceof|return|transient|catch|extends|int|short|try|char|final|interface|static|void|class|finally|long|strictfp|volatile|const|float|native|super|while|var|null|exports|module|open|opens|provides|requires|to|transitive|uses|with)\b/;

  // based on the java naming conventions
  const className = /\b[A-Z](?:\w*[a-z]\w*)?\b/;

  Prism.languages.java = Prism.languages.extend('clike', {
    'class-name': [
      className,

      // variables and parameters
      // this to support class names (or generic parameters) which do not contain a lower case letter (also works for methods)
      /\b[A-Z]\w*(?=\s+\w+\s*[;,=())])/
    ],
    'keyword': keywords,
    'function': [
      Prism.languages.clike.function,
      {
        pattern: /(\:\:)[a-z_]\w*/,
        lookbehind: true
      }
    ],
    'number': /\b0b[01][01_]*L?\b|\b0x[\da-f_]*\.?[\da-f_p+-]+\b|(?:\b\d[\d_]*\.?[\d_]*|\B\.\d[\d_]*)(?:e[+-]?\d[\d_]*)?[dfl]?/i,
    'operator': {
      pattern: /(^|[^.])(?:<<=?|>>>?=?|->|([-+&|])\2|[?:~]|[-+*/%&|^!=<>]=?)/m,
      lookbehind: true
    }
  });

  Prism.languages.insertBefore('java', 'class-name', {
    annotation: {
      alias: 'punctuation',
      pattern: /(^|[^.])@\w+/,
      lookbehind: true
    },
    namespace: {
      pattern: /(\b(?:exports|import(?:\s+static)?|module|open|opens|package|provides|requires|to|transitive|uses|with)\s+)[a-z]\w*(\.[a-z]\w*)+/,
      lookbehind: true,
      inside: {
        punctuation: /\./,
      }
    },
    generics: {
      pattern: /<(?:[\w\s,.&?]|<(?:[\w\s,.&?]|<(?:[\w\s,.&?]|<[\w\s,.&?]*>)*>)*>)*>/,
      inside: {
        'class-name': className,
        'keyword': keywords,
        'punctuation': /[<>(),.:]/,
        'operator': /[?&|]/
      }
    }
  });
}(Prism));
(function (Prism) {
  Prism.languages.php = Prism.languages.extend('clike', {
    keyword: /\b(?:__halt_compiler|abstract|and|array|as|break|callable|case|catch|class|clone|const|continue|declare|default|die|do|echo|else|elseif|empty|enddeclare|endfor|endforeach|endif|endswitch|endwhile|eval|exit|extends|final|finally|for|foreach|function|global|goto|if|implements|include|include_once|instanceof|insteadof|interface|isset|list|namespace|new|or|parent|print|private|protected|public|require|require_once|return|static|switch|throw|trait|try|unset|use|var|while|xor|yield)\b/i,
    boolean: {
      pattern: /\b(?:false|true)\b/i,
      alias: 'constant'
    },
    constant: [
      /\b[A-Z_][A-Z0-9_]*\b/,
      /\b(?:null)\b/i,
    ],
    comment: {
      pattern: /(^|[^\\])(?:\/\*[\s\S]*?\*\/|\/\/.*)/,
      lookbehind: true
    }
  });

  Prism.languages.insertBefore('php', 'string', {
    'shell-comment': {
      pattern: /(^|[^\\])#.*/,
      lookbehind: true,
      alias: 'comment'
    }
  });

  Prism.languages.insertBefore('php', 'comment', {
    delimiter: {
      pattern: /\?>$|^<\?(?:php(?=\s)|=)?/i,
      alias: 'important'
    }
  });

  Prism.languages.insertBefore('php', 'keyword', {
    variable: /\$+(?:\w+\b|(?={))/i,
    package: {
      pattern: /(\\|namespace\s+|use\s+)[\w\\]+/,
      lookbehind: true,
      inside: {
        punctuation: /\\/
      }
    }
  });

  // Must be defined after the function pattern
  Prism.languages.insertBefore('php', 'operator', {
    property: {
      pattern: /(->)[\w]+/,
      lookbehind: true
    }
  });

  const string_interpolation = {
    pattern: /{\$(?:{(?:{[^{}]+}|[^{}]+)}|[^{}])+}|(^|[^\\{])\$+(?:\w+(?:\[.+?]|->\w+)*)/,
    lookbehind: true,
    inside: {
      rest: Prism.languages.php
    }
  };

  Prism.languages.insertBefore('php', 'string', {
    'nowdoc-string': {
      pattern: /<<<'([^']+)'(?:\r\n?|\n)(?:.*(?:\r\n?|\n))*?\1;/,
      greedy: true,
      alias: 'string',
      inside: {
        delimiter: {
          pattern: /^<<<'[^']+'|[a-z_]\w*;$/i,
          alias: 'symbol',
          inside: {
            punctuation: /^<<<'?|[';]$/
          }
        }
      }
    },
    'heredoc-string': {
      pattern: /<<<(?:"([^"]+)"(?:\r\n?|\n)(?:.*(?:\r\n?|\n))*?\1;|([a-z_]\w*)(?:\r\n?|\n)(?:.*(?:\r\n?|\n))*?\2;)/i,
      greedy: true,
      alias: 'string',
      inside: {
        delimiter: {
          pattern: /^<<<(?:"[^"]+"|[a-z_]\w*)|[a-z_]\w*;$/i,
          alias: 'symbol',
          inside: {
            punctuation: /^<<<"?|[";]$/
          }
        },
        interpolation: string_interpolation // See below
      }
    },
    'single-quoted-string': {
      pattern: /'(?:\\[\s\S]|[^\\'])*'/,
      greedy: true,
      alias: 'string'
    },
    'double-quoted-string': {
      pattern: /"(?:\\[\s\S]|[^\\"])*"/,
      greedy: true,
      alias: 'string',
      inside: {
        interpolation: string_interpolation // See below
      }
    }
  });
  // The different types of PHP strings "replace" the C-like standard string
  delete Prism.languages.php.string;

  Prism.hooks.add('before-tokenize', function (env) {
    if (!/<\?/.test(env.code)) {
      return;
    }

    const phpPattern = /<\?(?:[^"'/#]|\/(?![*/])|("|')(?:\\[\s\S]|(?!\1)[^\\])*\1|(?:\/\/|#)(?:[^?\n\r]|\?(?!>))*|\/\*[\s\S]*?(?:\*\/|$))*?(?:\?>|$)/ig;
    Prism.languages['markup-templating'].buildPlaceholders(env, 'php', phpPattern);
  });

  Prism.hooks.add('after-tokenize', function (env) {
    Prism.languages['markup-templating'].tokenizePlaceholders(env, 'php');
  });

}(Prism));
Prism.languages.python = {
  'comment': {
    pattern: /(^|[^\\])#.*/,
    lookbehind: true
  },
  'string': /"""[\s\S]+?"""|'''[\s\S]+?'''|("|')(?:\\?.)*?\1/,
  'function': {
    pattern: /((?:^|\s)def[ \t]+)[a-zA-Z_][a-zA-Z0-9_]*(?=\()/g,
    lookbehind: true
  },
  'class-name': {
    pattern: /(\bclass\s+)[a-z0-9_]+/i,
    lookbehind: true
  },
  'keyword': /\b(?:as|assert|async|await|break|class|continue|def|del|elif|else|except|exec|finally|for|from|global|if|import|in|is|lambda|pass|print|raise|return|try|while|with|yield)\b/,
  'boolean': /\b(?:True|False)\b/,
  'number': /\b-?(?:0[bo])?(?:(?:\d|0x[\da-f])[\da-f]*\.?\d*|\.\d+)(?:e[+-]?\d+)?j?\b/i,
  'operator': /[-+%=]=?|!=|\*\*?=?|\/\/?=?|<[<=>]?|>[=>]?|[&|^~]|\b(?:or|and|not)\b/,
  'punctuation': /[{}[\];(),.:]/
};

/**
 * Original by Samuel Flores
 *
 * Adds the following new token classes:
 * 		constant, builtin, variable, symbol, regex
 */
(function (Prism) {
  Prism.languages.ruby = Prism.languages.extend('clike', {
    comment: [
      /#.*/,
      {
        pattern: /^=begin\s[\s\S]*?^=end/m,
        greedy: true
      }
    ],
    keyword: /\b(?:alias|and|BEGIN|begin|break|case|class|def|define_method|defined|do|each|else|elsif|END|end|ensure|false|for|if|in|module|new|next|nil|not|or|protected|private|public|raise|redo|require|rescue|retry|return|self|super|then|throw|true|undef|unless|until|when|while|yield)\b/
  });

  const interpolation = {
    pattern: /#\{[^}]+\}/,
    inside: {
      delimiter: {
        pattern: /^#\{|\}$/,
        alias: 'tag'
      },
      rest: Prism.languages.ruby
    }
  };

  delete Prism.languages.ruby.function;

  Prism.languages.insertBefore('ruby', 'keyword', {
    'regex': [
      {
        pattern: /%r([^a-zA-Z0-9\s{(\[<])(?:(?!\1)[^\\]|\\[\s\S])*\1[gim]{0,3}/,
        greedy: true,
        inside: {
          interpolation
        }
      },
      {
        pattern: /%r\((?:[^()\\]|\\[\s\S])*\)[gim]{0,3}/,
        greedy: true,
        inside: {
          interpolation
        }
      },
      {
        // Here we need to specifically allow interpolation
        pattern: /%r\{(?:[^#{}\\]|#(?:\{[^}]+\})?|\\[\s\S])*\}[gim]{0,3}/,
        greedy: true,
        inside: {
          interpolation
        }
      },
      {
        pattern: /%r\[(?:[^\[\]\\]|\\[\s\S])*\][gim]{0,3}/,
        greedy: true,
        inside: {
          interpolation
        }
      },
      {
        pattern: /%r<(?:[^<>\\]|\\[\s\S])*>[gim]{0,3}/,
        greedy: true,
        inside: {
          interpolation
        }
      },
      {
        pattern: /(^|[^/])\/(?!\/)(\[.+?]|\\.|[^/\\\r\n])+\/[gim]{0,3}(?=\s*($|[\r\n,.;})]))/,
        lookbehind: true,
        greedy: true
      }
    ],
    'variable': /[@$]+[a-zA-Z_]\w*(?:[?!]|\b)/,
    'symbol': {
      pattern: /(^|[^:]):[a-zA-Z_]\w*(?:[?!]|\b)/,
      lookbehind: true
    },
    'method-definition': {
      pattern: /(\bdef\s+)[\w.]+/,
      lookbehind: true,
      inside: {
        function: /\w+$/,
        rest: Prism.languages.ruby
      }
    }
  });

  Prism.languages.insertBefore('ruby', 'number', {
    builtin: /\b(?:Array|Bignum|Binding|Class|Continuation|Dir|Exception|FalseClass|File|Stat|Fixnum|Float|Hash|Integer|IO|MatchData|Method|Module|NilClass|Numeric|Object|Proc|Range|Regexp|String|Struct|TMS|Symbol|ThreadGroup|Thread|Time|TrueClass)\b/,
    constant: /\b[A-Z]\w*(?:[?!]|\b)/
  });

  Prism.languages.ruby.string = [
    {
      pattern: /%[qQiIwWxs]?([^a-zA-Z0-9\s{(\[<])(?:(?!\1)[^\\]|\\[\s\S])*\1/,
      greedy: true,
      inside: {
        interpolation
      }
    },
    {
      pattern: /%[qQiIwWxs]?\((?:[^()\\]|\\[\s\S])*\)/,
      greedy: true,
      inside: {
        interpolation
      }
    },
    {
      // Here we need to specifically allow interpolation
      pattern: /%[qQiIwWxs]?\{(?:[^#{}\\]|#(?:\{[^}]+\})?|\\[\s\S])*\}/,
      greedy: true,
      inside: {
        interpolation
      }
    },
    {
      pattern: /%[qQiIwWxs]?\[(?:[^\[\]\\]|\\[\s\S])*\]/,
      greedy: true,
      inside: {
        interpolation
      }
    },
    {
      pattern: /%[qQiIwWxs]?<(?:[^<>\\]|\\[\s\S])*>/,
      greedy: true,
      inside: {
        interpolation
      }
    },
    {
      pattern: /("|')(?:#\{[^}]+\}|\\(?:\r\n|[\s\S])|(?!\1)[^\\\r\n])*\1/,
      greedy: true,
      inside: {
        interpolation
      }
    }
  ];

  Prism.languages.rb = Prism.languages.ruby;
}(Prism));

(function (Prism) {
  const insideString = {
    variable: [
      // Arithmetic Environment
      {
        pattern: /\$?\(\([\s\S]+?\)\)/,
        inside: {
          // If there is a $ sign at the beginning highlight $(( and )) as variable
          variable: [{
            pattern: /(^\$\(\([\s\S]+)\)\)/,
            lookbehind: true
          },
            /^\$\(\(/
          ],
          number: /\b0x[\dA-Fa-f]+\b|(?:\b\d+\.?\d*|\B\.\d+)(?:[Ee]-?\d+)?/,
          // Operators according to https://www.gnu.org/software/bash/manual/bashref.html#Shell-Arithmetic
          operator: /--?|-=|\+\+?|\+=|!=?|~|\*\*?|\*=|\/=?|%=?|<<=?|>>=?|<=?|>=?|==?|&&?|&=|\^=?|\|\|?|\|=|\?|:/,
          // If there is no $ sign at the beginning highlight (( and )) as punctuation
          punctuation: /\(\(?|\)\)?|,|;/
        }
      },
      // Command Substitution
      {
        pattern: /\$\([^)]+\)|`[^`]+`/,
        greedy: true,
        inside: {
          variable: /^\$\(|^`|\)$|`$/
        }
      },
      /\$(?:[\w#?*!@]+|\{[^}]+\})/i
    ]
  };

  Prism.languages.bash = {
    shebang: {
      pattern: /^#!\s*\/bin\/bash|^#!\s*\/bin\/sh/,
      alias: 'important'
    },
    comment: {
      pattern: /(^|[^"{\\])#.*/,
      lookbehind: true
    },
    string: [
      // Support for Here-Documents https://en.wikipedia.org/wiki/Here_document
      {
        pattern: /((?:^|[^<])<<\s*)["']?(\w+?)["']?\s*\r?\n(?:[\s\S])*?\r?\n\2/,
        lookbehind: true,
        greedy: true,
        inside: insideString
      },
      {
        pattern: /(["'])(?:\\[\s\S]|\$\([^)]+\)|`[^`]+`|(?!\1)[^\\])*\1/,
        greedy: true,
        inside: insideString
      }
    ],
    variable: insideString.variable,
    // Originally based on http://ss64.com/bash/
    function: {
      pattern: /(^|[\s;|&])(?:add|alias|apropos|apt|apt-cache|apt-get|aptitude|aspell|automysqlbackup|awk|basename|bash|bc|bconsole|bg|builtin|bzip2|cal|cat|cd|cfdisk|chgrp|chkconfig|chmod|chown|chroot|cksum|clear|cmp|comm|command|cp|cron|crontab|csplit|curl|cut|date|dc|dd|ddrescue|debootstrap|df|diff|diff3|dig|dir|dircolors|dirname|dirs|dmesg|du|egrep|eject|enable|env|ethtool|eval|exec|expand|expect|export|expr|fdformat|fdisk|fg|fgrep|file|find|fmt|fold|format|free|fsck|ftp|fuser|gawk|getopts|git|gparted|grep|groupadd|groupdel|groupmod|groups|grub-mkconfig|gzip|halt|hash|head|help|hg|history|host|hostname|htop|iconv|id|ifconfig|ifdown|ifup|import|install|ip|jobs|join|kill|killall|less|link|ln|locate|logname|logout|logrotate|look|lpc|lpr|lprint|lprintd|lprintq|lprm|ls|lsof|lynx|make|man|mc|mdadm|mkconfig|mkdir|mke2fs|mkfifo|mkfs|mkisofs|mknod|mkswap|mmv|more|most|mount|mtools|mtr|mutt|mv|nano|nc|netstat|nice|nl|nohup|notify-send|npm|nslookup|op|open|parted|passwd|paste|pathchk|ping|pkill|pnpm|popd|pr|printcap|printenv|printf|ps|pushd|pv|pwd|quota|quotacheck|quotactl|ram|rar|rcp|read|readarray|readonly|reboot|remsync|rename|renice|rev|rm|rmdir|rpm|rsync|scp|screen|sdiff|sed|sendmail|seq|service|sftp|shift|shopt|shutdown|sleep|slocate|sort|source|split|ssh|stat|strace|su|sudo|sum|suspend|swapon|sync|tail|tar|tee|test|time|timeout|times|top|touch|tr|traceroute|trap|tsort|tty|type|ulimit|umask|umount|unalias|uname|unexpand|uniq|units|unrar|unshar|unzip|update-grub|uptime|useradd|userdel|usermod|users|uudecode|uuencode|vdir|vi|vim|virsh|vmstat|wait|watch|wc|wget|whereis|which|who|whoami|write|xargs|xdg-open|yarn|yes|zip|zypper)(?=$|[\s;|&])/,
      lookbehind: true
    },
    keyword: {
      pattern: /(^|[\s;|&])(?:let|:|\.|if|then|else|elif|fi|for|break|continue|while|in|case|function|select|do|done|until|echo|exit|return|set|declare)(?=$|[\s;|&])/,
      lookbehind: true
    },
    boolean: {
      pattern: /(^|[\s;|&])(?:true|false)(?=$|[\s;|&])/,
      lookbehind: true
    },
    operator: /&&?|\|\|?|==?|!=?|<<<?|>>|<=?|>=?|=~/,
    punctuation: /\$?\(\(?|\)\)?|\.\.|[{}[\];]/
  };

  // tslint:disable-next-line:no-string-literal
  const inside = insideString.variable[1]['inside'];
  inside.string = Prism.languages.bash.string;
  inside.function = Prism.languages.bash.function;
  inside.keyword = Prism.languages.bash.keyword;
  inside.boolean = Prism.languages.bash.boolean;
  inside.operator = Prism.languages.bash.operator;
  inside.punctuation = Prism.languages.bash.punctuation;

  Prism.languages.shell = Prism.languages.bash;
})(Prism);

Prism.languages.docker = {
  keyword: {
    pattern: /(^\s*)(?:ADD|ARG|CMD|COPY|ENTRYPOINT|ENV|EXPOSE|FROM|HEALTHCHECK|LABEL|MAINTAINER|ONBUILD|RUN|SHELL|STOPSIGNAL|USER|VOLUME|WORKDIR)(?=\s)/mi,
    lookbehind: true
  },
  string: /("|')(?:(?!\1)[^\\\r\n]|\\(?:\r\n|[\s\S]))*\1/,
  comment: /#.*/,
  punctuation: /---|\.\.\.|[:[\]{}\-,|>?]/
};

Prism.languages.dockerfile = Prism.languages.docker;

Prism.languages.erlang = {
  'comment': /%.+/,
  'string': {
    pattern: /"(?:\\.|[^\\"\r\n])*"/,
    greedy: true
  },
  'quoted-function': {
    pattern: /'(?:\\.|[^\\'\r\n])+'(?=\()/,
    alias: 'function'
  },
  'quoted-atom': {
    pattern: /'(?:\\.|[^\\'\r\n])+'/,
    alias: 'atom'
  },
  'boolean': /\b(?:true|false)\b/,
  'keyword': /\b(?:fun|when|case|of|end|if|receive|after|try|catch)\b/,
  'number': [
    /\$\\?./,
    /\d+#[a-z0-9]+/i,
    /(?:\b\d+\.?\d*|\B\.\d+)(?:e[+-]?\d+)?/i
  ],
  'function': /\b[a-z][\w@]*(?=\()/,
  'variable': {
    // Look-behind is used to prevent wrong highlighting of atoms containing "@"
    pattern: /(^|[^@])(?:\b|\?)[A-Z_][\w@]*/,
    lookbehind: true
  },
  'operator': [
    /[=\/<>:]=|=[:\/]=|\+\+?|--?|[=*\/!]|\b(?:bnot|div|rem|band|bor|bxor|bsl|bsr|not|and|or|xor|orelse|andalso)\b/,
    {
      // We don't want to match <<
      pattern: /(^|[^<])<(?!<)/,
      lookbehind: true
    },
    {
      // We don't want to match >>
      pattern: /(^|[^>])>(?!>)/,
      lookbehind: true
    }
  ],
  'atom': /\b[a-z][\w@]*/,
  'punctuation': /[()[\]{}:;,.#|]|<<|>>/

};
Prism.languages.go = Prism.languages.extend('clike', {
  keyword: /\b(?:break|case|chan|const|continue|default|defer|else|fallthrough|for|func|go(?:to)?|if|import|interface|map|package|range|return|select|struct|switch|type|var)\b/,
  builtin: /\b(?:bool|byte|complex(?:64|128)|error|float(?:32|64)|rune|string|u?int(?:8|16|32|64)?|uintptr|append|cap|close|complex|copy|delete|imag|len|make|new|panic|print(?:ln)?|real|recover)\b/,
  boolean: /\b(?:_|iota|nil|true|false)\b/,
  operator: /[*\/%^!=]=?|\+[=+]?|-[=-]?|\|[=|]?|&(?:=|&|\^=?)?|>(?:>=?|=)?|<(?:<=?|=|-)?|:=|\.\.\./,
  number: /(?:\b0x[a-f\d]+|(?:\b\d+\.?\d*|\B\.\d+)(?:e[-+]?\d+)?)i?/i,
  string: {
    pattern: /(["'`])(\\[\s\S]|(?!\1)[^\\])*\1/,
    greedy: true
  }
});
delete Prism.languages.go['class-name'];

Prism.languages.graphql = {
  'comment': /#.*/,
  'string': {
    pattern: /"(?:\\.|[^\\"\r\n])*"/,
    greedy: true
  },
  'number': /(?:\B-|\b)\d+(?:\.\d+)?(?:e[+-]?\d+)?\b/i,
  'boolean': /\b(?:true|false)\b/,
  'variable': /\$[a-z_]\w*/i,
  'directive': {
    pattern: /@[a-z_]\w*/i,
    alias: 'function'
  },
  'attr-name': {
    pattern: /[a-z_]\w*(?=\s*(?:\((?:[^()"]|"(?:\\.|[^\\"\r\n])*")*\))?:)/i,
    greedy: true
  },
  'class-name': {
    pattern: /(\b(?:enum|implements|interface|on|scalar|type|union)\s+)[a-zA-Z_]\w*/,
    lookbehind: true
  },
  'fragment': {
    pattern: /(\bfragment\s+|\.{3}\s*(?!on\b))[a-zA-Z_]\w*/,
    lookbehind: true,
    alias: 'function'
  },
  'keyword': /\b(?:enum|fragment|implements|input|interface|mutation|on|query|scalar|schema|type|union)\b/,
  'operator': /[!=|]|\.{3}/,
  'punctuation': /[!(){}\[\]:=,]/,
  'constant': /\b(?!ID\b)[A-Z][A-Z_\d]*\b/
};

Prism.languages.json = {
  comment: /\/\/.*|\/\*[\s\S]*?(?:\*\/|$)/,
  property: {
    pattern: /"(?:\\.|[^\\"\r\n])*"(?=\s*:)/,
    greedy: true
  },
  string: {
    pattern: /"(?:\\.|[^\\"\r\n])*"(?!\s*:)/,
    greedy: true
  },
  number: /-?\d+\.?\d*(e[+-]?\d+)?/i,
  punctuation: /[{}[\],]/,
  operator: /:/,
  boolean: /\b(?:true|false)\b/,
  null: {
    pattern: /\bnull\b/,
    alias: 'keyword'
  }
};

(function (Prism) {
  Prism.languages.kotlin = Prism.languages.extend('clike', {
    keyword: {
      // The lookbehind prevents wrong highlighting of e.g. kotlin.properties.get
      pattern: /(^|[^.])\b(?:abstract|actual|annotation|as|break|by|catch|class|companion|const|constructor|continue|crossinline|data|do|dynamic|else|enum|expect|external|final|finally|for|fun|get|if|import|in|infix|init|inline|inner|interface|internal|is|lateinit|noinline|null|object|open|operator|out|override|package|private|protected|public|reified|return|sealed|set|super|suspend|tailrec|this|throw|to|try|typealias|val|var|vararg|when|where|while)\b/,
      lookbehind: true
    },
    function: [
      /\w+(?=\s*\()/,
      {
        pattern: /(\.)\w+(?=\s*\{)/,
        lookbehind: true
      }
    ],
    number: /\b(?:0[xX][\da-fA-F]+(?:_[\da-fA-F]+)*|0[bB][01]+(?:_[01]+)*|\d+(?:_\d+)*(?:\.\d+(?:_\d+)*)?(?:[eE][+-]?\d+(?:_\d+)*)?[fFL]?)\b/,
    operator: /\+[+=]?|-[-=>]?|==?=?|!(?:!|==?)?|[\/*%<>]=?|[?:]:?|\.\.|&&|\|\||\b(?:and|inv|or|shl|shr|ushr|xor)\b/
  });

  delete Prism.languages.kotlin['class-name'];
}(Prism));

Prism.languages.lua = {
  comment: /^#!.+|--(?:\[(=*)\[[\s\S]*?\]\1\]|.*)/m,
  // \z may be used to skip the following space
  string: {
    pattern: /(["'])(?:(?!\1)[^\\\r\n]|\\z(?:\r\n|\s)|\\(?:\r\n|[\s\S]))*\1|\[(=*)\[[\s\S]*?\]\2\]/,
    greedy: true
  },
  number: /\b0x[a-f\d]+\.?[a-f\d]*(?:p[+-]?\d+)?\b|\b\d+(?:\.\B|\.?\d*(?:e[+-]?\d+)?\b)|\B\.\d+(?:e[+-]?\d+)?\b/i,
  keyword: /\b(?:and|break|do|else|elseif|end|false|for|function|goto|if|in|local|nil|not|or|repeat|return|then|true|until|while)\b/,
  function: /(?!\d)\w+(?=\s*(?:[({]))/,
  operator: [
    /[-+*%^&|#]|\/\/?|<[<=]?|>[>=]?|[=~]=?/,
    {
      // Match ".." but don't break "..."
      pattern: /(^|[^.])\.\.(?!\.)/,
      lookbehind: true
    }
  ],
  punctuation: /[\[\](){},;]|\.+|:+/
};
Prism.languages.typescript = Prism.languages.extend('javascript', {
  // From JavaScript Prism keyword list and TypeScript language spec: https://github.com/Microsoft/TypeScript/blob/master/doc/spec.md#221-reserved-words
  keyword: /\b(?:abstract|as|async|await|break|case|catch|class|const|constructor|continue|debugger|declare|default|delete|do|else|enum|export|extends|finally|for|from|function|get|if|implements|import|in|instanceof|interface|is|keyof|let|module|namespace|new|null|of|package|private|protected|public|readonly|return|require|set|static|super|switch|this|throw|try|type|typeof|var|void|while|with|yield)\b/,
  builtin: /\b(?:string|Function|any|number|boolean|Array|symbol|console|Promise|unknown|never)\b/,
});

Prism.languages.ts = Prism.languages.typescript;

Prism.languages.objectivec = Prism.languages.extend('c', {
  keyword: /\b(?:asm|typeof|inline|auto|break|case|char|const|continue|default|do|double|else|enum|extern|float|for|goto|if|int|long|register|return|short|signed|sizeof|static|struct|switch|typedef|union|unsigned|void|volatile|while|in|self|super)\b|(?:@interface|@end|@implementation|@protocol|@class|@public|@protected|@private|@property|@try|@catch|@finally|@throw|@synthesize|@dynamic|@selector)\b/,
  string: /("|')(?:\\(?:\r\n|[\s\S])|(?!\1)[^\\\r\n])*\1|@"(?:\\(?:\r\n|[\s\S])|[^"\\\r\n])*"/,
  operator: /-[->]?|\+\+?|!=?|<<?=?|>>?=?|==?|&&?|\|\|?|[~^%?*\/@]/
});

delete Prism.languages.objectivec['class-name'];

Prism.languages.perl = {
  comment: [
    {
      // POD
      pattern: /(^\s*)=\w+[\s\S]*?=cut.*/m,
      lookbehind: true
    },
    {
      pattern: /(^|[^\\$])#.*/,
      lookbehind: true
    }
  ],
  // TODO Could be nice to handle Heredoc too.
  string: [
    // q/.../
    {
      pattern: /\b(?:q|qq|qx|qw)\s*([^a-zA-Z0-9\s{(\[<])(?:(?!\1)[^\\]|\\[\s\S])*\1/,
      greedy: true
    },

    // q a...a
    {
      pattern: /\b(?:q|qq|qx|qw)\s+([a-zA-Z0-9])(?:(?!\1)[^\\]|\\[\s\S])*\1/,
      greedy: true
    },

    // q(...)
    {
      pattern: /\b(?:q|qq|qx|qw)\s*\((?:[^()\\]|\\[\s\S])*\)/,
      greedy: true
    },

    // q{...}
    {
      pattern: /\b(?:q|qq|qx|qw)\s*\{(?:[^{}\\]|\\[\s\S])*\}/,
      greedy: true
    },

    // q[...]
    {
      pattern: /\b(?:q|qq|qx|qw)\s*\[(?:[^[\]\\]|\\[\s\S])*\]/,
      greedy: true
    },

    // q<...>
    {
      pattern: /\b(?:q|qq|qx|qw)\s*<(?:[^<>\\]|\\[\s\S])*>/,
      greedy: true
    },

    // "...", `...`
    {
      pattern: /("|`)(?:(?!\1)[^\\]|\\[\s\S])*\1/,
      greedy: true
    },

    // '...'
    // FIXME Multi-line single-quoted strings are not supported as they would break variables containing '
    {
      pattern: /'(?:[^'\\\r\n]|\\.)*'/,
      greedy: true
    }
  ],
  regex: [
    // m/.../
    {
      pattern: /\b(?:m|qr)\s*([^a-zA-Z0-9\s{(\[<])(?:(?!\1)[^\\]|\\[\s\S])*\1[msixpodualngc]*/,
      greedy: true
    },

    // m a...a
    {
      pattern: /\b(?:m|qr)\s+([a-zA-Z0-9])(?:(?!\1)[^\\]|\\[\s\S])*\1[msixpodualngc]*/,
      greedy: true
    },

    // m(...)
    {
      pattern: /\b(?:m|qr)\s*\((?:[^()\\]|\\[\s\S])*\)[msixpodualngc]*/,
      greedy: true
    },

    // m{...}
    {
      pattern: /\b(?:m|qr)\s*\{(?:[^{}\\]|\\[\s\S])*\}[msixpodualngc]*/,
      greedy: true
    },

    // m[...]
    {
      pattern: /\b(?:m|qr)\s*\[(?:[^[\]\\]|\\[\s\S])*\][msixpodualngc]*/,
      greedy: true
    },

    // m<...>
    {
      pattern: /\b(?:m|qr)\s*<(?:[^<>\\]|\\[\s\S])*>[msixpodualngc]*/,
      greedy: true
    },

    // The lookbehinds prevent -s from breaking
    // FIXME We don't handle change of separator like s(...)[...]
    // s/.../.../
    {
      pattern: /(^|[^-]\b)(?:s|tr|y)\s*([^a-zA-Z0-9\s{(\[<])(?:(?!\2)[^\\]|\\[\s\S])*\2(?:(?!\2)[^\\]|\\[\s\S])*\2[msixpodualngcer]*/,
      lookbehind: true,
      greedy: true
    },

    // s a...a...a
    {
      pattern: /(^|[^-]\b)(?:s|tr|y)\s+([a-zA-Z0-9])(?:(?!\2)[^\\]|\\[\s\S])*\2(?:(?!\2)[^\\]|\\[\s\S])*\2[msixpodualngcer]*/,
      lookbehind: true,
      greedy: true
    },

    // s(...)(...)
    {
      pattern: /(^|[^-]\b)(?:s|tr|y)\s*\((?:[^()\\]|\\[\s\S])*\)\s*\((?:[^()\\]|\\[\s\S])*\)[msixpodualngcer]*/,
      lookbehind: true,
      greedy: true
    },

    // s{...}{...}
    {
      pattern: /(^|[^-]\b)(?:s|tr|y)\s*\{(?:[^{}\\]|\\[\s\S])*\}\s*\{(?:[^{}\\]|\\[\s\S])*\}[msixpodualngcer]*/,
      lookbehind: true,
      greedy: true
    },

    // s[...][...]
    {
      pattern: /(^|[^-]\b)(?:s|tr|y)\s*\[(?:[^[\]\\]|\\[\s\S])*\]\s*\[(?:[^[\]\\]|\\[\s\S])*\][msixpodualngcer]*/,
      lookbehind: true,
      greedy: true
    },

    // s<...><...>
    {
      pattern: /(^|[^-]\b)(?:s|tr|y)\s*<(?:[^<>\\]|\\[\s\S])*>\s*<(?:[^<>\\]|\\[\s\S])*>[msixpodualngcer]*/,
      lookbehind: true,
      greedy: true
    },

    // /.../
    // The look-ahead tries to prevent two divisions on
    // the same line from being highlighted as regex.
    // This does not support multi-line regex.
    {
      pattern: /\/(?:[^\/\\\r\n]|\\.)*\/[msixpodualngc]*(?=\s*(?:$|[\r\n,.;})&|\-+*~<>!?^]|(lt|gt|le|ge|eq|ne|cmp|not|and|or|xor|x)\b))/,
      greedy: true
    }
  ],

  // FIXME Not sure about the handling of ::, ', and #
  variable: [
    // ${^POSTMATCH}
    /[&*$@%]\{\^[A-Z]+\}/,
    // $^V
    /[&*$@%]\^[A-Z_]/,
    // ${...}
    /[&*$@%]#?(?=\{)/,
    // $foo
    /[&*$@%]#?(?:(?:::)*'?(?!\d)[\w$]+)+(?:::)*/i,
    // $1
    /[&*$@%]\d+/,
    // $_, @_, %!
    // The negative lookahead prevents from breaking the %= operator
    /(?!%=)[$@%][!"#$%&'()*+,\-.\/:;<=>?@[\\\]^_`{|}~]/
  ],
  filehandle: {
    // <>, <FOO>, _
    pattern: /<(?![<=])\S*>|\b_\b/,
    alias: 'symbol'
  },
  vstring: {
    // v1.2, 1.2.3
    pattern: /v\d+(?:\.\d+)*|\d+(?:\.\d+){2,}/,
    alias: 'string'
  },
  function: {
    pattern: /sub [a-z0-9_]+/i,
    inside: {
      keyword: /sub/
    }
  },
  keyword: /\b(?:any|break|continue|default|delete|die|do|else|elsif|eval|for|foreach|given|goto|if|last|local|my|next|our|package|print|redo|require|say|state|sub|switch|undef|unless|until|use|when|while)\b/,
  number: /\b(?:0x[\dA-Fa-f](?:_?[\dA-Fa-f])*|0b[01](?:_?[01])*|(?:\d(?:_?\d)*)?\.?\d(?:_?\d)*(?:[Ee][+-]?\d+)?)\b/,
  operator: /-[rwxoRWXOezsfdlpSbctugkTBMAC]\b|\+[+=]?|-[-=>]?|\*\*?=?|\/\/?=?|=[=~>]?|~[~=]?|\|\|?=?|&&?=?|<(?:=>?|<=?)?|>>?=?|![~=]?|[%^]=?|\.(?:=|\.\.?)?|[\\?]|\bx(?:=|\b)|\b(?:lt|gt|le|ge|eq|ne|cmp|not|and|or|xor)\b/,
  punctuation: /[{}[\];(),:]/
};

Prism.languages.sql = {
  comment: {
    pattern: /(^|[^\\])(?:\/\*[\s\S]*?\*\/|(?:--|\/\/|#).*)/,
    lookbehind: true
  },
  variable: [
    {
      pattern: /@(["'`])(?:\\[\s\S]|(?!\1)[^\\])+\1/,
      greedy: true
    },
    /@[\w.$]+/
  ],
  string: {
    pattern: /(^|[^@\\])("|')(?:\\[\s\S]|(?!\2)[^\\]|\2\2)*\2/,
    greedy: true,
    lookbehind: true
  },
  function: /\b(?:AVG|COUNT|FIRST|FORMAT|LAST|LCASE|LEN|MAX|MID|MIN|MOD|NOW|ROUND|SUM|UCASE)(?=\s*\()/i, // Should we highlight user defined functions too?
  keyword: /\b(?:ACTION|ADD|AFTER|ALGORITHM|ALL|ALTER|ANALYZE|ANY|APPLY|AS|ASC|AUTHORIZATION|AUTO_INCREMENT|BACKUP|BDB|BEGIN|BERKELEYDB|BIGINT|BINARY|BIT|BLOB|BOOL|BOOLEAN|BREAK|BROWSE|BTREE|BULK|BY|CALL|CASCADED?|CASE|CHAIN|CHAR(?:ACTER|SET)?|CHECK(?:POINT)?|CLOSE|CLUSTERED|COALESCE|COLLATE|COLUMNS?|COMMENT|COMMIT(?:TED)?|COMPUTE|CONNECT|CONSISTENT|CONSTRAINT|CONTAINS(?:TABLE)?|CONTINUE|CONVERT|CREATE|CROSS|CURRENT(?:_DATE|_TIME|_TIMESTAMP|_USER)?|CURSOR|CYCLE|DATA(?:BASES?)?|DATE(?:TIME)?|DAY|DBCC|DEALLOCATE|DEC|DECIMAL|DECLARE|DEFAULT|DEFINER|DELAYED|DELETE|DELIMITERS?|DENY|DESC|DESCRIBE|DETERMINISTIC|DISABLE|DISCARD|DISK|DISTINCT|DISTINCTROW|DISTRIBUTED|DO|DOUBLE|DROP|DUMMY|DUMP(?:FILE)?|DUPLICATE|ELSE(?:IF)?|ENABLE|ENCLOSED|END|ENGINE|ENUM|ERRLVL|ERRORS|ESCAPED?|EXCEPT|EXEC(?:UTE)?|EXISTS|EXIT|EXPLAIN|EXTENDED|FETCH|FIELDS|FILE|FILLFACTOR|FIRST|FIXED|FLOAT|FOLLOWING|FOR(?: EACH ROW)?|FORCE|FOREIGN|FREETEXT(?:TABLE)?|FROM|FULL|FUNCTION|GEOMETRY(?:COLLECTION)?|GLOBAL|GOTO|GRANT|GROUP|HANDLER|HASH|HAVING|HOLDLOCK|HOUR|IDENTITY(?:_INSERT|COL)?|IF|IGNORE|IMPORT|INDEX|INFILE|INNER|INNODB|INOUT|INSERT|INT|INTEGER|INTERSECT|INTERVAL|INTO|INVOKER|ISOLATION|ITERATE|JOIN|KEYS?|KILL|LANGUAGE|LAST|LEAVE|LEFT|LEVEL|LIMIT|LINENO|LINES|LINESTRING|LOAD|LOCAL|LOCK|LONG(?:BLOB|TEXT)|LOOP|MATCH(?:ED)?|MEDIUM(?:BLOB|INT|TEXT)|MERGE|MIDDLEINT|MINUTE|MODE|MODIFIES|MODIFY|MONTH|MULTI(?:LINESTRING|POINT|POLYGON)|NATIONAL|NATURAL|NCHAR|NEXT|NO|NONCLUSTERED|NULLIF|NUMERIC|OFF?|OFFSETS?|ON|OPEN(?:DATASOURCE|QUERY|ROWSET)?|OPTIMIZE|OPTION(?:ALLY)?|ORDER|OUT(?:ER|FILE)?|OVER|PARTIAL|PARTITION|PERCENT|PIVOT|PLAN|POINT|POLYGON|PRECEDING|PRECISION|PREPARE|PREV|PRIMARY|PRINT|PRIVILEGES|PROC(?:EDURE)?|PUBLIC|PURGE|QUICK|RAISERROR|READS?|REAL|RECONFIGURE|REFERENCES|RELEASE|RENAME|REPEAT(?:ABLE)?|REPLACE|REPLICATION|REQUIRE|RESIGNAL|RESTORE|RESTRICT|RETURNS?|REVOKE|RIGHT|ROLLBACK|ROUTINE|ROW(?:COUNT|GUIDCOL|S)?|RTREE|RULE|SAVE(?:POINT)?|SCHEMA|SECOND|SELECT|SERIAL(?:IZABLE)?|SESSION(?:_USER)?|SET(?:USER)?|SHARE|SHOW|SHUTDOWN|SIMPLE|SMALLINT|SNAPSHOT|SOME|SONAME|SQL|START(?:ING)?|STATISTICS|STATUS|STRIPED|SYSTEM_USER|TABLES?|TABLESPACE|TEMP(?:ORARY|TABLE)?|TERMINATED|TEXT(?:SIZE)?|THEN|TIME(?:STAMP)?|TINY(?:BLOB|INT|TEXT)|TOP?|TRAN(?:SACTIONS?)?|TRIGGER|TRUNCATE|TSEQUAL|TYPES?|UNBOUNDED|UNCOMMITTED|UNDEFINED|UNION|UNIQUE|UNLOCK|UNPIVOT|UNSIGNED|UPDATE(?:TEXT)?|USAGE|USE|USER|USING|VALUES?|VAR(?:BINARY|CHAR|CHARACTER|YING)|VIEW|WAITFOR|WARNINGS|WHEN|WHERE|WHILE|WITH(?: ROLLUP|IN)?|WORK|WRITE(?:TEXT)?|YEAR)\b/i,
  boolean: /\b(?:TRUE|FALSE|NULL)\b/i,
  number: /\b0x[\da-f]+\b|\b\d+\.?\d*|\B\.\d+\b/i,
  operator: /[-+*\/=%^~]|&&?|\|\|?|!=?|<(?:=>?|<|>)?|>[>=]?|\b(?:AND|BETWEEN|IN|LIKE|NOT|OR|IS|DIV|REGEXP|RLIKE|SOUNDS LIKE|XOR)\b/i,
  punctuation: /[;[\]()`,.]/
};

// issues: nested multiline comments
Prism.languages.swift = Prism.languages.extend('clike', {
  string: {
    pattern: /("|')(\\(?:\((?:[^()]|\([^)]+\))+\)|\r\n|[\s\S])|(?!\1)[^\\\r\n])*\1/,
    greedy: true,
    inside: {
      interpolation: {
        pattern: /\\\((?:[^()]|\([^)]+\))+\)/,
        inside: {
          delimiter: {
            pattern: /^\\\(|\)$/,
            alias: 'variable'
          }
          // See rest below
        }
      }
    }
  },
  keyword: /\b(?:as|associativity|break|case|catch|class|continue|convenience|default|defer|deinit|didSet|do|dynamic(?:Type)?|else|enum|extension|fallthrough|final|for|func|get|guard|if|import|in|infix|init|inout|internal|is|lazy|left|let|mutating|new|none|nonmutating|operator|optional|override|postfix|precedence|prefix|private|protocol|public|repeat|required|rethrows|return|right|safe|self|Self|set|static|struct|subscript|super|switch|throws?|try|Type|typealias|unowned|unsafe|var|weak|where|while|willSet|__(?:COLUMN__|FILE__|FUNCTION__|LINE__))\b/,
  number: /\b(?:[\d_]+(?:\.[\de_]+)?|0x[a-f0-9_]+(?:\.[a-f0-9p_]+)?|0b[01_]+|0o[0-7_]+)\b/i,
  constant: /\b(?:nil|[A-Z_]{2,}|k[A-Z][A-Za-z_]+)\b/,
  atrule: /@\b(?:IB(?:Outlet|Designable|Action|Inspectable)|class_protocol|exported|noreturn|NS(?:Copying|Managed)|objc|UIApplicationMain|auto_closure)\b/,
  builtin: /\b(?:[A-Z]\S+|abs|advance|alignof(?:Value)?|assert|contains|count(?:Elements)?|debugPrint(?:ln)?|distance|drop(?:First|Last)|dump|enumerate|equal|filter|find|first|getVaList|indices|isEmpty|join|last|lexicographicalCompare|map|max(?:Element)?|min(?:Element)?|numericCast|overlaps|partition|print(?:ln)?|reduce|reflect|reverse|sizeof(?:Value)?|sort(?:ed)?|split|startsWith|stride(?:of(?:Value)?)?|suffix|swap|toDebugString|toString|transcode|underestimateCount|unsafeBitCast|with(?:ExtendedLifetime|Unsafe(?:MutablePointers?|Pointers?)|VaList))\b/
});
Prism.languages.swift.string.inside.interpolation.inside.rest = Prism.languages.swift;

Prism.languages.yaml = {
  scalar: {
    pattern: /([\-:]\s*(?:![^\s]+)?[ \t]*[|>])[ \t]*(?:((?:\r?\n|\r)[ \t]+)[^\r\n]+(?:\2[^\r\n]+)*)/,
    lookbehind: true,
    alias: 'string'
  },
  comment: /#.*/,
  key: {
    pattern: /(\s*(?:^|[:\-,[{\r\n?])[ \t]*(?:![^\s]+)?[ \t]*)[^\r\n{[\]},#\s]+?(?=\s*:\s)/,
    lookbehind: true,
    alias: 'atrule'
  },
  directive: {
    pattern: /(^[ \t]*)%.+/m,
    lookbehind: true,
    alias: 'important'
  },
  datetime: {
    pattern: /([:\-,[{]\s*(?:![^\s]+)?[ \t]*)(?:\d{4}-\d\d?-\d\d?(?:[tT]|[ \t]+)\d\d?:\d{2}:\d{2}(?:\.\d*)?[ \t]*(?:Z|[-+]\d\d?(?::\d{2})?)?|\d{4}-\d{2}-\d{2}|\d\d?:\d{2}(?::\d{2}(?:\.\d*)?)?)(?=[ \t]*(?:$|,|]|}))/m,
    lookbehind: true,
    alias: 'number'
  },
  boolean: {
    pattern: /([:\-,[{]\s*(?:![^\s]+)?[ \t]*)(?:true|false)[ \t]*(?=$|,|]|})/im,
    lookbehind: true,
    alias: 'important'
  },
  null: {
    pattern: /([:\-,[{]\s*(?:![^\s]+)?[ \t]*)(?:null|~)[ \t]*(?=$|,|]|})/im,
    lookbehind: true,
    alias: 'important'
  },
  string: {
    pattern: /([:\-,[{]\s*(?:![^\s]+)?[ \t]*)("|')(?:(?!\2)[^\\\r\n]|\\.)*\2(?=[ \t]*(?:$|,|]|}|\s*#))/m,
    lookbehind: true,
    greedy: true
  },
  number: {
    pattern: /([:\-,[{]\s*(?:![^\s]+)?[ \t]*)[+-]?(?:0x[\da-f]+|0o[0-7]+|(?:\d+\.?\d*|\.?\d+)(?:e[+-]?\d+)?|\.inf|\.nan)[ \t]*(?=$|,|]|})/im,
    lookbehind: true
  },
  tag: /![^\s]+/,
  important: /[&*][\w]+/,
  punctuation: /---|[:[\]{}\-,|>?]|\.\.\./
};

Prism.languages.yml = Prism.languages.yaml;
(function (Prism) {

  const specialEscape = {
    pattern: /\\[\\(){}[\]^$+*?|.]/,
    alias: 'escape'
  };
  const escape = /\\(?:x[\da-fA-F]{2}|u[\da-fA-F]{4}|u\{[\da-fA-F]+\}|c[a-zA-Z]|0[0-7]{0,2}|[123][0-7]{2}|.)/;
  const charClass = /\\[wsd]|\.|\\p{[^{}]+}/i;

  const rangeChar = '(?:[^\\\\-]|' + escape.source + ')';
  const range = RegExp(rangeChar + '-' + rangeChar);

  // the name of a capturing group
  const groupName = {
    pattern: /(<|')[^<>']+(?=[>']$)/,
    lookbehind: true,
    alias: 'variable'
  };

  const backreference = [
    /\\(?![123][0-7]{2})[1-9]/, // a backreference which is not an octal escape
    {
      pattern: /\\k<[^<>']+>/,
      inside: {
        'group-name': groupName
      }
    }
  ];

  Prism.languages.regex = {
    'charset': {
      pattern: /((?:^|[^\\])(?:\\\\)*)\[(?:[^\\\]]|\\[\s\S])*\]/,
      lookbehind: true,
      inside: {
        'charset-negation': {
          pattern: /(^\[)\^/,
          lookbehind: true,
        },
        'charset-punctuation': /^\[|\]$/,
        'range': {
          pattern: range,
          inside: {
            'escape': escape,
            'range-punctuation': /-/
          }
        },
        'special-escape': specialEscape,
        'charclass': charClass,
        'backreference': backreference,
        'escape': escape
      }
    },
    'special-escape': specialEscape,
    'charclass': charClass,
    'backreference': backreference,
    'anchor': /[$^]|\\[ABbGZz]/,
    'escape': escape,
    'group': [
      {
        // https://docs.oracle.com/javase/10/docs/api/java/util/regex/Pattern.html
        // https://docs.microsoft.com/en-us/dotnet/standard/base-types/regular-expression-language-quick-reference?view=netframework-4.7.2#grouping-constructs

        // (), (?<name>), (?'name'), (?>), (?:), (?=), (?!), (?<=), (?<!), (?is-m), (?i-m:)
        pattern: /\((?:\?(?:<[^<>']+>|'[^<>']+'|[>:]|<?[=!]|[idmnsuxU]+(?:-[idmnsuxU]+)?:?))?/,
        inside: {
          'group-name': groupName
        }
      },
      /\)/
    ],
    'quantifier': /[+*?]|\{(?:\d+,?\d*)\}/,
    'alternation': /\|/
  };

  [
    'actionscript',
    'coffescript',
    'flow',
    'javascript',
    'typescript',
    'vala'
  ].forEach(function (lang) {
    const grammar = Prism.languages[lang];
    if (grammar) {
      grammar.regex.inside = {
        'regex-flags': /[a-z]+$/,
        'regex-delimiter': /^\/|\/$/,
        'language-regex': {
          pattern: /[\s\S]+/,
          inside: Prism.languages.regex
        }
      };
    }
  });
}(Prism));

export default Prism;