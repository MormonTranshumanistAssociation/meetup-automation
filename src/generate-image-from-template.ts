import sharp from "sharp";
import path from "node:path";
import fs from "node:fs";
import * as faceapi from "@vladmandic/face-api";
import canvas from "canvas";

// Patch face-api environment to use node-canvas
const { Canvas, Image, ImageData } = canvas;
// @ts-ignore
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

const assetsDir = path.resolve(__dirname, "../assets");
const outputDir = path.resolve(__dirname, "../output");
const backgroundPath = path.join(assetsDir, "galaxy-background.jpg");
const logoPath = path.join(assetsDir, "mta-logo-lightgrey.png");
const outputPath = path.join(outputDir, "announcement-image.png");

async function loadModels() {
	const modelPath = path.resolve(__dirname, "../models");
	await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelPath);
	await faceapi.nets.faceLandmark68Net.loadFromDisk(modelPath);
}

async function getFaceCrop(imagePath: string, size: number) {
	// Load image using canvas
	const img = await canvas.loadImage(imagePath);
	const c = new Canvas(img.width, img.height);
	const ctx = c.getContext("2d");
	ctx.drawImage(img, 0, 0);

	// Detect face
	// @ts-ignore
	const detections = await faceapi.detectSingleFace(c).withFaceLandmarks();
	if (!detections) throw new Error("No face detected in portrait image.");
	const box = detections.detection.box;

	// Calculate square crop around the face
	const centerX = box.x + box.width / 2;
	const centerY = box.y + box.height / 2;
	const cropSize = Math.max(box.width, box.height) * 1.7; // show more area around the face
	const left = Math.max(0, Math.round(centerX - cropSize / 2));
	const top = Math.max(0, Math.round(centerY - cropSize / 2));
	const right = Math.min(img.width, Math.round(centerX + cropSize / 2));
	const bottom = Math.min(img.height, Math.round(centerY + cropSize / 2));
	const width = right - left;
	const height = bottom - top;

	// Crop and resize to square
	const cropped = await sharp(imagePath)
		.extract({ left, top, width, height })
		.resize(size, size)
		.toBuffer();

	// Add a 10px border matching the logo color (lighter gray)
	const borderColor = "#aaaaaa"; // medium gray
	const borderWidth = 10;
	const bordered = await sharp({
		create: {
			width: size + borderWidth * 2,
			height: size + borderWidth * 2,
			channels: 4,
			background: { r: 170, g: 170, b: 170, alpha: 1 }, // #aaaaaa
		},
	})
		.composite([{ input: cropped, left: borderWidth, top: borderWidth }])
		.png()
		.toBuffer();
	return bordered;
}

function createTitleSVG(text: string, width: number, height: number) {
	const fontPath = path.resolve(
		__dirname,
		"../assets/abolition-normal-400.woff2",
	);
	const fontData = fs.readFileSync(fontPath).toString("base64");
	const subtitleFontPath = path.resolve(
		__dirname,
		"../assets/noticia-text-regular.ttf",
	);
	const subtitleFontData = fs.readFileSync(subtitleFontPath).toString("base64");
	// Split text into lines that fit within the width (rough estimate: 1.8em per char at 80pt)
	const maxCharsPerLine = Math.floor((width / 80) * 3.2);
	const words = text.split(" ");
	const lines = [];
	let currentLine = "";
	for (const word of words) {
		if (
			`${currentLine} ${word}`.trim().length > maxCharsPerLine &&
			currentLine.length > 0
		) {
			lines.push(currentLine.trim());
			currentLine = word;
		} else {
			currentLine += ` ${word}`;
		}
	}
	if (currentLine) lines.push(currentLine.trim());
	const lineHeight = 80; // match font size for vertical spacing
	const subtitle = "discussion led by Carl Youngblood";
	return `
	<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
		<defs>
			<style type="text/css">
				@font-face {
					font-family: 'Abolition';
					src: url('data:font/woff2;base64,${fontData}') format('woff2');
				}
				@font-face {
					font-family: 'Noticia Text';
					src: url('data:font/ttf;base64,${subtitleFontData}') format('truetype');
				}
				.title { font-family: 'Abolition', Arial, sans-serif; font-size: 80pt; fill: #aaaaaa; }
				.subtitle { font-family: 'Noticia Text', serif; font-size: 48pt; fill: #aaaaaa; }
			</style>
			<filter id="halo" x="-40%" y="-40%" width="180%" height="180%">
				<feDropShadow dx="0" dy="0" stdDeviation="15" flood-color="black" flood-opacity="0.9"/>
			</filter>
		</defs>
		${lines.map((line, i) => `<text x="0" y="${60 + i * lineHeight}" class="title" alignment-baseline="hanging" filter="url(#halo)">${line}</text>`).join("")}
		<text x="0" y="${60 + lines.length * lineHeight + 10}" class="subtitle" alignment-baseline="hanging" filter="url(#halo)">${subtitle}</text>
	</svg>
	`;
}

function createEventDetailsSVG(width: number, height: number) {
	const subtitleFontPath = path.resolve(
		__dirname,
		"../assets/noticia-text-regular.ttf",
	);
	const subtitleFontData = fs.readFileSync(subtitleFontPath).toString("base64");
	const details = ["Meetup", "13 May 2025", "8pm Mountain time"];
	const lineHeight = 48; // match subtitle font size
	return `
	<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
		<defs>
			<style type="text/css">
				@font-face {
					font-family: 'Noticia Text';
					src: url('data:font/ttf;base64,${subtitleFontData}') format('truetype');
				}
				.event-details { font-family: 'Noticia Text', serif; font-size: 48pt; fill: #aaaaaa; }
			</style>
			<filter id="halo" x="-40%" y="-40%" width="180%" height="180%">
				<feDropShadow dx="0" dy="0" stdDeviation="15" flood-color="black" flood-opacity="0.9"/>
			</filter>
		</defs>
		${details.map((line, i) => `<text x="0" y="${60 + i * lineHeight}" class="event-details" alignment-baseline="hanging" filter="url(#halo)">${line}</text>`).join("")}
	</svg>
	`;
}

async function generateImage() {
	await loadModels();
	// Ensure output directory exists
	if (!fs.existsSync(outputDir)) {
		fs.mkdirSync(outputDir);
	}

	// Get background metadata
	const backgroundMeta = await sharp(backgroundPath).metadata();
	if (!backgroundMeta.width || !backgroundMeta.height) {
		throw new Error("Could not determine background image dimensions.");
	}

	// Calculate logo width (1/5th of background width)
	const logoWidth = Math.round(backgroundMeta.width / 5);

	// Resize logo
	const logoBuffer = await sharp(logoPath)
		.resize({ width: logoWidth })
		.toBuffer();

	// Get resized logo metadata
	const logoMeta = await sharp(logoBuffer).metadata();
	if (!logoMeta.width || !logoMeta.height) {
		throw new Error("Could not determine logo image dimensions.");
	}

	// Position logo in bottom right with a 100px margin
	const margin = 100;
	const left = backgroundMeta.width - logoMeta.width - margin;
	const top = backgroundMeta.height - logoMeta.height - margin;

	// Create a dark blurred shadow version of the logo
	const shadowBuffer = await sharp(logoPath)
		.resize({ width: logoWidth })
		.tint({ r: 0, g: 0, b: 0 }) // fill with black
		.blur(10)
		.modulate({ brightness: 0.05 }) // darken
		.toBuffer();

	// Add face portrait to top-left
	const portraitPath = path.join(assetsDir, "carl-portrait.jpg");
	const faceSize = logoWidth; // use same size as logo
	const faceMargin = 100;
	const faceBuffer = await getFaceCrop(portraitPath, faceSize);

	// Title SVG
	const titleText =
		"The Singularity Is Nearer: Revisiting Kurzweil's Prophecies in 2025";
	const titleMargin = 60;
	const titleWidth =
		backgroundMeta.width - (faceMargin + faceSize + titleMargin + margin); // space to the right of the portrait
	const titleHeight = 350; // enough for up to 2 lines and subtitle
	const titleSVG = createTitleSVG(titleText, titleWidth, titleHeight);
	const titleBuffer = Buffer.from(titleSVG);

	// Event details SVG
	const eventDetailsLineCount = 3;
	const eventDetailsLineHeight = 48;
	const eventDetailsYOffset = 20; // initial y offset in SVG
	const eventDetailsHeight =
		eventDetailsYOffset + eventDetailsLineCount * eventDetailsLineHeight;
	const eventDetailsWidth = 700;
	const eventDetailsSVG = createEventDetailsSVG(
		eventDetailsWidth,
		eventDetailsHeight,
	);
	const eventDetailsBuffer = Buffer.from(eventDetailsSVG);

	// Composite shadow, logo, face, and title
	await sharp(backgroundPath)
		.composite([
			{
				input: shadowBuffer,
				left,
				top,
			},
			{
				input: logoBuffer,
				left,
				top,
			},
			{
				input: faceBuffer,
				left: faceMargin,
				top: faceMargin,
			},
			{
				input: titleBuffer,
				left: faceMargin + faceSize + titleMargin,
				top: faceMargin,
			},
			{
				input: eventDetailsBuffer,
				left: faceMargin,
				top: backgroundMeta.height - margin - eventDetailsHeight,
			},
		])
		.toFile(outputPath);

	console.log(`Image generated at: ${outputPath}`);
}

generateImage().catch((err) => {
	console.error("Error generating image:", err);
	process.exit(1);
});
