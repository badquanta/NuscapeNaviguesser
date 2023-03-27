# Nuscape Naviguesser

"Nuscape Naviguesser" is intended to be an homage to Netscape Navigator 3.0.  It is simple a GtkWebView inside a bit of Glade defined browser interface and what limited logic that has been programmed is done so in JavaScript. So in a way the browser that birthed JavaScript is in a way reborn via JavaScript. ~260 lines of JavaScript actually; probably ~240 if I stripped out all spaces and comments.

### COPYRIGHT DISCLAIMER

I do not own any of the copyrights to any of the icons, they belong to whomever currently owns what was Netscape/AOL and I can't be bothered to look that up.  This project exists only to recreate the look of the original browser in a form of homage to it and the web of yesteryear it birthed.

## Why?

I'm an older millennial & I have a pretty heavy case of nostalgia. My only personal usecase for this is to grab screenshots of websites that the original Netscape Navigator could not properly load.  At the moment it accomplishes this goal. I have no real plans on completing further browser functionality. It is just a GTK application with a WebKit view and some event handlers plugged together to make a semi-working web browser.

## What works? ALMOST NOTHING

Basically the browser can load a URL typed into the `location` bar. The `back`, `forward`, `home`, `reload`, and `stop` buttons on the toolbar (and menu) have been linked to the corrisponding actions on the WebKit view with minimal additional logic (such as updating the location bar, status bar & load progress.)  Technically you can open up and view the "browser history" window; but it doesn't nothing more than show the history.

## What doens't work: ALMOST EVERYTHING

I am not joking, basically nothing complex is implemented.  Most websites I've tested it with "just work" out of the box with WebKit but some don't quite work right.  For instance loading Facebook *mostly* works fine; but there are cases where it doesn't like trying to interact with comment threads.

## Installation

1. Clone this repository

    git clone https://github.com/badquanta/NuscapeNaviguesser && cd NuscapeNaviguesser

2. Install dependencies
This requires node, npm, libgirepository1.0-dev, & libcairo-dev (debian package names) before npm install can be run.  I've added a simple bash script that'll call `sudo apt install npm... && npm install`.. or just open `apt-install-deps.sh` to see what it does.

   ./apt-install-deps.sh

3. That's it; just run the program

  ./naviguesser

## Usage

The main file is `naviguesser.js`; and the repo includes a symlink to this file as `naviguesser`. It's marked as executable and has a hashbang at the top so you should be able to run it from the command line like so:

    ./naviguesser [uri]

If you don't specify a URL the browser will automatically load `http://theoldnet.com` because of course this is all about the internet of old.

### REPL

While figuring out how to wire up events and get certain asthetics working I added a Node REPL console that is accessible via the `--repl` command line switch. To access it just run the program like so:

    ./naviguesser --repl [uri]

### Verbose debugging output

Again while hacking this I sprinked debugging statements into the event handlers.  You can enable these with the command line switch: `--debug`

## History Window

I've only barely begun to implement the idea of "browsing history". The browser will log it to the `.history` file on close in the current working directory and read this file on startup to restore previous browsing history. That's all it does at the moment though. You can view this history via the menu bar: "Window -> History" but at the moment it doesn't do anything else but show you the history as I have implemented nothing else.
