# Meetup Automation

This project will help the MTA to post meetup announcements more easily, and
also notify meetup attendees via email and/or text message before a meetup takes
place.

## PLEASE NOTE

This project follows the goals set forward by Tom Preston-Warner in
[README-driven
development](https://tom.preston-werner.com/2010/08/23/readme-driven-development).
If you ever change something in the code that affects the instructions in this
file, please update it to reflect your changes. Also, if you add any
functionality that you think the developers of this project should know, make
sure you add it here.

## TODO

- Deploy the image generation to a Lambda function
- Add ability to upload a portrait to a cloud-based location before generating an announcement
- Add a web form to submit to the function so that it is easier to use

## Setting up your development environment

Make sure that you add the appropriate environment variables to your `.env` file
in order to test this in a staging environment. You can see an example of what
variables need to be set in `.env.example`.

This assumes that [pnpm](https://pnpm.io/) has already been installed in your
global environment.

Some dependencies (like `canvas` and `sharp`) require native build steps after
installation. To ensure pnpm automatically approves these build steps, run:

```bash
pnpm config set ignore-scripts false
pnpm config set approve-builds true
```

This will allow pnpm to run necessary post-install scripts for native modules
without prompting for manual approval.

If you are on MacOS, you must install some system libraries for native modules
(like `canvas` and `sharp`) to work. Install them with Homebrew:

```bash
brew install pkg-config cairo pango libpng jpeg giflib librsvg
```

If you encounter errors related to native bindings or missing libraries when
installing dependencies or running scripts, make sure these packages are
installed.

If you are on Linux or Windows Subsystem for Linux (WSL), install the required
libraries with:

```bash
sudo apt-get update
sudo apt-get install -y build-essential pkg-config libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev libpng-dev
```

If you encounter errors related to native bindings or missing libraries when
installing dependencies or running scripts, make sure these packages are
installed.

This project uses face detection models from face-api.js. These model files must
be downloaded manually due to GitHub/CDN restrictions on automated downloads.

**Download the following files in your browser:**
- [ssd_mobilenetv1_model-weights_manifest.json](https://justadudewhohacks.github.io/face-api.js/models/ssd_mobilenetv1_model-weights_manifest.json)
- [ssd_mobilenetv1_model-shard1](https://justadudewhohacks.github.io/face-api.js/models/ssd_mobilenetv1_model-shard1)
- [ssd_mobilenetv1_model-shard2](https://justadudewhohacks.github.io/face-api.js/models/ssd_mobilenetv1_model-shard2)
- [face_landmark_68_model-weights_manifest.json](https://justadudewhohacks.github.io/face-api.js/models/face_landmark_68_model-weights_manifest.json)
- [face_landmark_68_model-shard1](https://justadudewhohacks.github.io/face-api.js/models/face_landmark_68_model-shard1)

**Place all three files in the `models/` directory at the root of this
project.**

If the `models/` directory does not exist, create it first:
```bash
mkdir models
```

If you do not download these files, face detection will not work and the image
generation script will fail.

After installing all the binary dependencies, you can install the npm packages
with:

```bash
pnpm i
```

## Testing

You can run the image generation script as follows:

```bash
pnpm run generate:image
```

This will generate a sample image using hard-coded parameters. You can also pass
custom parameters for the title, discussion leader, date, time, and portrait
file:

```bash
pnpm run generate:image -- \
  --title "The Singularity Is Nearer: Revisiting Kurzweil's Prophecies in 2025" \
  --leader "Carl Youngblood" \
  --date "13 May 2025" \
  --time "8pm Mountain time" \
  --portrait "carl-portrait.jpg" \
  [--normalize]
```

The portrait parameter can be either a local image file or a URL to an online
image.

- Add `--normalize` to apply auto-leveling (contrast/brightness normalization)
  to the portrait image.

The result will be in the `output` folder