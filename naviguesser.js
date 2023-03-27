#!/usr/bin/env node
/**
 * Nuscape Naviguesser is only intended for novelty or nostalgia purposes.
 * The goal is to have a somewhat faithful reimplementation of Netscape Navigator 3.0(ish.)
 */
'use strict';
const Glib = require('node-gtk');
const Gtk = Glib.require('Gtk', '3.0');
const Gdk = Glib.require('Gdk', '3.0');
const WebKit2 = Glib.require('WebKit2', '4.0');
const GObject = Glib.require('GObject');
const GdkPixbuf = Glib.require('GdkPixbuf');
const Path = require('path');
const Cmd = require('commander');
const cmdOptions = Cmd.opts();
const Repl = require('repl');
const Fs = require('fs');
const uiFilePath = Path.join(__dirname, './naviguesser.glade');
const historyFilePath = Path.join(__dirname, './.history.json');
const ui = {};
/** Simple print error & halt function. */
function fatalError(...message) {
  console.error('Naviguesser Fatal Error:');
  console.error(...message);
  return process.exit(1);
}
/** Only error if the condition is not truthy. */
function fatalIfNot(condition, ...message) {
  if (!condition) {
    fatalError(...message);
  }
}
/** Only output if cmdOption.debug is true. */
function dbg(...message) {
  if (cmdOptions.debug) {
    if (ui.repl) { ui.repl.clearLine(); }
    console.debug(...message);
    if (ui.repl) { ui.repl.prompt(); }
  }
}
/** The command line interface definition */
Cmd // Start of CLI
  .description('nuscape naviguesser world-wide-web browser.')
  .argument('[uri]', 'a uri to open instead of the home page.')
  .option('--debug', 'Enable debug tracing output.')
  .option('--repl', 'Enable repl service.')
  ; // End of CLI
Cmd.parse().opts();// command line parsing
Glib.startLoop(); // initialization
Gdk.init([]);
Gtk.init([]);
function getRequired(id) {
  var got = builder.getObject(id);
  fatalIfNot(got, `Unable to get built object %o`, id)
  return got;
}
const builder = Gtk.Builder.newFromFile(uiFilePath);
const animatedLogo = GdkPixbuf.PixbufAnimation.newFromFile(Path.join(__dirname, './icons/logo-animated.gif'));
const staticLogo = GdkPixbuf.Pixbuf.newFromFile(Path.join(__dirname, './icons/logo-animated.gif'));
/** Gets the id from the builder, has a fatalError if value is null. */
// Add GtkWidgets references from builder to our "ui" handles collection.
Object.assign(ui, {
  /** @note the default window title from the glade file will be appended to this. */
  titleSuffix: " - ",
  win: getRequired('Naviguess'),
  webView: getRequired('NavView'),
  wvSettings: getRequired('WebKitSettings'),
  urlBar: getRequired('NaviguessUrlBar'),
  urlBarLogo: getRequired('UrlBarLogo'),
  status: getRequired('NaviguessStatus'),
  statusProgress: getRequired('StatusProgress'),
  action: {
    Exit: getRequired('ActionExit'),
    Back: getRequired('ActionBack'),
    Home: getRequired('ActionHome'),
    Forward: getRequired('ActionForward'),
    Reload: getRequired('ActionReload'),
    Stop: getRequired('ActionStop'),
    ShowHistory: getRequired('ActionShowHistory'),
  },
  UrlBarCompletionStore: getRequired('UrlBarCompletionStore'),
  HistoryList: getRequired('HistoryList'),
  HistoryWin: getRequired('HistoryWin'),
  HistoryTreeView: getRequired('HistoryTreeView'),
  repl: null,
});
// WIP: Initialize History Tree View
{
  var col = new Gtk.TreeViewColumn({ title: 'Title' });
  var renderer = new Gtk.CellRendererText();
  col.packStart(renderer, true);
  col.addAttribute(renderer, 'text', 0);
  ui.HistoryTreeView.appendColumn(col);

  col = new Gtk.TreeViewColumn({ title: 'uri' });
  renderer = new Gtk.CellRendererText();
  col.packStart(renderer, true);
  col.addAttribute(renderer, 'text', 1);
  ui.HistoryTreeView.appendColumn(col);

  col = new Gtk.TreeViewColumn({ title: 'timestamp' });
  renderer = new Gtk.CellRendererText();
  col.packStart(renderer, true);
  col.addAttribute(renderer, 'text', 2);
  ui.HistoryTreeView.appendColumn(col);
}
/** Cleanly exit the program. */
function shutdown() {
  if (ui.repl) { ui.repl.close(); ui.repl = null; console.log(''); }
  saveHistory();
  ui.win.destroy();
  Gtk.mainQuit();
  process.exit(0);
}
// Save the original title from the glade file to use as a suffix to webpage titles.
ui.titleSuffix += ui.win.title;
// window setup
ui.win.setDefaultSize(600, 400); // @TODO make this a setting that is saved.
ui.win.on('show', Gtk.main);
ui.win.on('hide', shutdown);

ui.urlBar.on('activate', () => {
  var href;
  dbg('ui.urlBar#activate');
  ui.status.push(0, 'Url bar navigation');
  href = ui.urlBar.getText();
  ui.urlBar.setText(href);
  ui.win.title = href + ui.titleSuffix;
  ui.webView.loadUri(href);
  return ui.status.pop(0);
});
ui.HistoryWin.on('delete-event', () => { ui.HistoryWin.hide(); return true; })
/** Update current WebView "Load-Change" progress on status bar */
function updateLoadProgress() {
  var val = ui.webView.getEstimatedLoadProgress();
  ui.statusProgress.setFraction(val);
  if (val < 1.0) {
    setTimeout(updateLoadProgress, 250);
  } else {
    ui.statusProgress.hide();
  }
}
//** Simply add the title & uri to a new address. */
function appendHistory(title, uri, timestamp = Date.now()) {
  var iter = ui.HistoryList.append();
  var titleVal = new GObject.Value();
  titleVal.init(GObject.typeFromName('gchararray'));
  titleVal.setString(title);
  ui.HistoryList.setValue(iter, 0, titleVal);

  var uriVal = new GObject.Value();
  uriVal.init(GObject.typeFromName('gchararray'));
  uriVal.setString(uri);
  ui.HistoryList.setValue(iter, 1, uriVal);

  var timestampVal = new GObject.Value();
  timestampVal.init(GObject.typeFromName('gint64'));
  timestampVal.setInt64(timestamp);
  ui.HistoryList.setValue(iter, 2, timestampVal);
}
/** Save the current content of the HistoryList to a file. */
function saveHistory() {
  var data = [];
  ui.HistoryList.foreach((mdl, path, iter) => {
    var title = mdl.getValue(iter, 0).getString();
    var uri = mdl.getValue(iter, 1).getString();
    var timestamp = mdl.getValue(iter, 2).getInt64();
    data.push([title, uri, timestamp]);
    return false;
  });
  Fs.writeFileSync('.history', JSON.stringify(data, undefined, 2), { encoding: 'utf8' });
}
/** Load the content of a History file and append it to the history list */
function loadHistory() {
  Fs.promises.readFile('.history', { encoding: 'utf8' }).then((buffer) => {
    var data = JSON.parse(buffer);
    //dbg("Need to finish implementing loadHistory()");
    data.forEach((row) => { appendHistory(...row); });
  }).catch((reason) => {
    // Ignore if history does not yet exist.
    dbg("Unable to load previous history because: %s", reason);
  })
}
/** Handle WebView 'load-change' signal: */
ui.webView.on('load-changed', (loadEvent) => {
  var newUri;
  newUri = ui.webView.getUri();
  switch (loadEvent) {
    case WebKit2.LoadEvent.STARTED:
      dbg('WebView:load-changed STARTED')
      ui.status.push(0, `Loading...`);
      ui.statusProgress.show();
      ui.urlBarLogo.pixbufAnimation = animatedLogo;
      updateLoadProgress();

      break;
    case WebKit2.LoadEvent.REDIRECTED:
      dbg('WebView:load-changed REDIRECTED');
      ui.status.pop(0);
      ui.status.push(0, `Redirected to ${newUri}`);
      break;
    case WebKit2.LoadEvent.FINISHED:
      dbg('WebView:Load-changed FINISHED');
      ui.urlBarLogo.pixbuf = staticLogo;
      ui.status.pop(0);
      ui.win.title = ui.webView.title + ui.titleSuffix;
      appendHistory(ui.webView.title, ui.webView.uri);
      ui.action.Stop.setSensitive(false);
      break
    case WebKit2.LoadEvent.COMMITTED:
      dbg('WebView:load-changed COMMITTED');
      ui.status.pop(0);
      ui.status.push(0, `Downloading ${newUri}`)
      ui.win.title = newUri + ui.titleSuffix;
      ui.urlBar.setText(newUri);
      ui.action.Back.setSensitive(ui.webView.canGoBack());
      ui.action.Forward.setSensitive(ui.webView.canGoForward());
      ui.action.Stop.setSensitive(true);
      break;
    default:
      dbg('Unhandled load change event:', loadEvent);
  }
  return false
});
/** Netscape 3.0 didn't have a white background:
 * @todo:  this should not be static but dynamically
 *        detected and be theme/platform dependent.
 */
ui.webView.setBackgroundColor(new Gdk.RGBA(0x00, 0x77, 0x77));
/** Connect UI Forward button to WebView */
ui.action.Forward.on('activate', () => { ui.webView.goForward(); return false; })
ui.action.Back.on('activate', () => { ui.webView.goBack(); return false; });
ui.action.Exit.on('activate', () => { if (ui.win) { ui.win.destroy(); } });
ui.action.Reload.on('activate', () => { if (ui.webView) { ui.webView.reload(); } });
ui.action.Stop.on('activate', () => { return ui.webView.stopLoading(); });
ui.action.Home.on('activate', () => { ui.webView.loadUri('http://theoldnet.com'); })
ui.action.ShowHistory.on('activate', () => { ui.HistoryWin.show(); });
ui.status.push(0, `Nuscape naviguess, Webkit ${WebKit2.getMajorVersion()}.${WebKit2.getMinorVersion()}`);

function main() {
  var startPage;
  loadHistory();
  if (Cmd.args[0]) {
    startPage = Cmd.args[0];
  } else {
    startPage = 'http://theoldnet.com';
  }
  ui.webView.loadUri(startPage);
  return ui.win.showAll();
}
// start the REPL server
if (cmdOptions.repl) {
  ui.repl = Repl.start({ input: process.stdin, output: process.stdout })
  Object.assign(ui.repl.context, {
    builder, ui, Glib, Gtk, Gdk, GdkPixbuf, GObject, shutdown, cmdOptions, Cmd,
    animatedLogo
  });
}
if(require.main == module) main();