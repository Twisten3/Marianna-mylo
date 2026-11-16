# For you, Marianna

A small original ASCII bouquet of 33 pink roses, inspired by a terminal-style coding video. The full-screen browser scene is tuned for phone screens, with a bouquet that blooms from an empty starry sky, shooting stars, and fireworks. The project also includes a separate animated Python terminal version. No video, external libraries, fonts, or image assets are needed.

## Terminal version

```bash
python3 rose_bouquet.py
```

Press `SPACE` to send more petals and `Q` to exit. To print a single frame, use `python3 rose_bouquet.py --once`; add `--no-color` for plain text.

## Browser version

Open `index.html` in a browser. If local file restrictions get in the way, run a small server from this folder:

```bash
python3 -m http.server 8000
```

Then visit <http://127.0.0.1:8000>.

## GitHub Pages

The site deploys automatically from `main` through GitHub Actions. After the first successful deployment, visit <https://twisten3.github.io/Marianna-mylo/>.
