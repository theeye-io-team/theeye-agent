# ps-aux [![build status](https://secure.travis-ci.org/thlorenz/ps-aux.png)](http://travis-ci.org/thlorenz/ps-aux)

Supplies process information via the `ps aux` command.

Tested on Linux and OSX.

```js
var Psaux = require('psaux')
  , psaux = Psaux();

psaux.parsed(function (err, res) {
  if (err) return console.error(err);
  console.log(res);
})
```

```js
[ 
  { user: 'thlorenz',
    pid: 1050,
    '%cpu': 2.6,
    '%mem': 1.3,
    vsz: 4490356,
    rss: 217636,
    tty: '??',
    state: 'S',
    started: '5Aug14',
    time: '123:03.05',
    command: '/Applications/iTerm.app/Contents/MacOS/iTerm' },
  { user: '_coreaudiod',
    pid: 257,
    '%cpu': 0.6,
    '%mem': 0.2,
    vsz: 2553344,
    rss: 38572,
    tty: '??',
    state: 'Ss',
    started: '5Aug14',
    time: '32:23.58',
    command: '/usr/sbin/coreaudiod' },
    [...]
]
```

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**  *generated with [DocToc](http://doctoc.herokuapp.com/)*

- [Installation](#installation)
- [API](#api)
    - [Psaux](#psaux)
    - [psaux::clearInterval()](#psauxclearinterval)
    - [psaux::obtain(cb)](#psauxobtaincb)
    - [psaux::parsed(cb)](#psauxparsedcb)
    - [psaux::setInterval(opts)](#psauxsetintervalopts)
    - [psaux::singleton() → {object}](#psauxsingleton-→-object)
    - [Example](#example)
- [License](#license)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->


## Installation

    npm install ps-aux

## API

<!-- START docme generated API please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN docme TO UPDATE -->

<div>
<div class="jsdoc-githubify">
<section>
<article>
<div class="container-overview">
<dl class="details">
</dl>
</div>
<dl>
<dt>
<h4 class="name" id="Psaux"><span class="type-signature"></span>Psaux<span class="type-signature"></span></h4>
</dt>
<dd>
<div class="description">
<p>Creates a <code>psaux</code> object.</p>
</div>
<dl class="details">
<dt class="tag-source">Source:</dt>
<dd class="tag-source"><ul class="dummy">
<li>
<a href="https://github.com/thlorenz/ps-aux/blob/master/index.js">index.js</a>
<span>, </span>
<a href="https://github.com/thlorenz/ps-aux/blob/master/index.js#L34">lineno 34</a>
</li>
</ul></dd>
</dl>
</dd>
</dl>
<dl>
<dt>
<h4 class="name" id="psaux::clearInterval"><span class="type-signature"></span>psaux::clearInterval<span class="signature">()</span><span class="type-signature"></span></h4>
</dt>
<dd>
<div class="description">
<p>Clears any previously registered interval at which process information was obtained
and emitted.</p>
</div>
<dl class="details">
<dt class="tag-source">Source:</dt>
<dd class="tag-source"><ul class="dummy">
<li>
<a href="https://github.com/thlorenz/ps-aux/blob/master/index.js">index.js</a>
<span>, </span>
<a href="https://github.com/thlorenz/ps-aux/blob/master/index.js#L167">lineno 167</a>
</li>
</ul></dd>
<dt class="tag-see">See:</dt>
<dd class="tag-see">
<ul>
<li><a href="global.html#psaux::setInterval">psaux::setInterval</a></li>
</ul>
</dd>
</dl>
</dd>
<dt>
<h4 class="name" id="psaux::obtain"><span class="type-signature"></span>psaux::obtain<span class="signature">(cb)</span><span class="type-signature"></span></h4>
</dt>
<dd>
<div class="description">
<p>Obtains raw process information</p>
</div>
<h5>Parameters:</h5>
<table class="params">
<thead>
<tr>
<th>Name</th>
<th>Type</th>
<th class="last">Description</th>
</tr>
</thead>
<tbody>
<tr>
<td class="name"><code>cb</code></td>
<td class="type">
<span class="param-type">function</span>
</td>
<td class="description last"><p>called back with an array of strings each containing information of a running process</p></td>
</tr>
</tbody>
</table>
<dl class="details">
<dt class="tag-source">Source:</dt>
<dd class="tag-source"><ul class="dummy">
<li>
<a href="https://github.com/thlorenz/ps-aux/blob/master/index.js">index.js</a>
<span>, </span>
<a href="https://github.com/thlorenz/ps-aux/blob/master/index.js#L49">lineno 49</a>
</li>
</ul></dd>
</dl>
</dd>
<dt>
<h4 class="name" id="psaux::parsed"><span class="type-signature"></span>psaux::parsed<span class="signature">(cb)</span><span class="type-signature"></span></h4>
</dt>
<dd>
<div class="description">
<p>Obtains process information and parses it.</p>
<p>VSZ is the Virtual Memory Size. It includes all memory that the process can
access, including memory that is swapped out and memory that is from shared
libraries.</p>
<p>RSS is the Resident Set Size and is used to show how much memory is
allocated to that process and is in RAM. It does not include memory that is
swapped out. It does include memory from shared libraries as long as the
pages from those libraries are actually in memory. It does include all stack
and heap memory.</p>
</div>
<h5>Parameters:</h5>
<table class="params">
<thead>
<tr>
<th>Name</th>
<th>Type</th>
<th class="last">Description</th>
</tr>
</thead>
<tbody>
<tr>
<td class="name"><code>cb</code></td>
<td class="type">
<span class="param-type">function</span>
</td>
<td class="description last"><p>called back with an array containing running process information</p>
<p><strong>process info:</strong></p>
<ul>
<li><strong>user</strong>    : id of the user that owns the process</li>
<li><strong>pid</strong>     : process id</li>
<li><strong>%cpu</strong>    : percent of the CPU usage</li>
<li><strong>%mem</strong>    : percent memory usage</li>
<li><strong>vsz</strong>     : virtual memory size</li>
<li><strong>rss</strong>     : resident set size</li>
<li><strong>tty</strong>     : controlling terminal</li>
<li><strong>state</strong>   : current state of the process (i.e. sleeping)</li>
<li><strong>started</strong> : start time of process</li>
<li><strong>time</strong>    : how long the process is running</li>
<li><strong>command</strong> : command line used to start the process (including args)</li>
</ul></td>
</tr>
</tbody>
</table>
<dl class="details">
<dt class="tag-source">Source:</dt>
<dd class="tag-source"><ul class="dummy">
<li>
<a href="https://github.com/thlorenz/ps-aux/blob/master/index.js">index.js</a>
<span>, </span>
<a href="https://github.com/thlorenz/ps-aux/blob/master/index.js#L80">lineno 80</a>
</li>
</ul></dd>
</dl>
</dd>
<dt>
<h4 class="name" id="psaux::setInterval"><span class="type-signature"></span>psaux::setInterval<span class="signature">(opts)</span><span class="type-signature"></span></h4>
</dt>
<dd>
<div class="description">
<p>Causes the psaux object to obtain process information at the given interval
and emit an event for each.
When invoked, previously set intervals are cancelled.</p>
</div>
<h5>Parameters:</h5>
<table class="params">
<thead>
<tr>
<th>Name</th>
<th>Type</th>
<th class="last">Description</th>
</tr>
</thead>
<tbody>
<tr>
<td class="name"><code>opts</code></td>
<td class="type">
<span class="param-type">Object</span>
</td>
<td class="description last"><p>options</p>
<h6>Properties</h6>
<table class="params">
<thead>
<tr>
<th>Name</th>
<th>Type</th>
<th class="last">Description</th>
</tr>
</thead>
<tbody>
<tr>
<td class="name"><code>parsed</code></td>
<td class="type">
<span class="param-type">boolean</span>
</td>
<td class="description last"><p>if true, the process information is parsed before it is emitted (default: <code>true</code>)</p></td>
</tr>
<tr>
<td class="name"><code>interval</code></td>
<td class="type">
<span class="param-type">number</span>
</td>
<td class="description last"><p>interval in milliseconds at which to emit process information (default: <code>20,000</code>)</p></td>
</tr>
</tbody>
</table>
</td>
</tr>
</tbody>
</table>
<dl class="details">
<dt class="tag-source">Source:</dt>
<dd class="tag-source"><ul class="dummy">
<li>
<a href="https://github.com/thlorenz/ps-aux/blob/master/index.js">index.js</a>
<span>, </span>
<a href="https://github.com/thlorenz/ps-aux/blob/master/index.js#L145">lineno 145</a>
</li>
</ul></dd>
</dl>
</dd>
<dt>
<h4 class="name" id="psaux::singleton"><span class="type-signature"></span>psaux::singleton<span class="signature">()</span><span class="type-signature"> &rarr; {object}</span></h4>
</dt>
<dd>
<div class="description">
<p>A singleton psaux instance.
Use it in order to ensure that you only use one instance throughout your app.</p>
<h4>Example</h4>
<pre><code class="lang-js">// foo.js
var psaux = require('ps-aux').singleton
psaux.setInterval({ parsed: true, interval: 5000 });
// bar.js
var psaux = require('ps-aux').singleton
psaux.on('info', console.log);</code></pre>
</div>
<dl class="details">
<dt class="tag-source">Source:</dt>
<dd class="tag-source"><ul class="dummy">
<li>
<a href="https://github.com/thlorenz/ps-aux/blob/master/index.js">index.js</a>
<span>, </span>
<a href="https://github.com/thlorenz/ps-aux/blob/master/index.js#L181">lineno 181</a>
</li>
</ul></dd>
</dl>
<h5>Returns:</h5>
<div class="param-desc">
<p>a constructed <code>psaux</code> object</p>
</div>
<dl>
<dt>
Type
</dt>
<dd>
<span class="param-type">object</span>
</dd>
</dl>
</dd>
</dl>
</article>
</section>
</div>

*generated with [docme](https://github.com/thlorenz/docme)*
</div>
<!-- END docme generated API please keep comment here to allow auto update -->

## License

MIT
