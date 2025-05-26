import sharp from "sharp";
import path from "node:path";
import fs from "node:fs";

const assetsDir = path.resolve(__dirname, "../assets");
const outputDir = path.resolve(__dirname, "../output");
const backgroundPath = path.join(assetsDir, "galaxy-background.jpg");
const logoPath = path.join(assetsDir, "mta-logo-grey.png");
const outputPath = path.join(outputDir, "announcement-image.png");

async function generateImage() {
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

	// Composite images
	await sharp(backgroundPath)
		.composite([
			{
				input: logoBuffer,
				left,
				top,
			},
		])
		.toFile(outputPath);

	console.log(`Image generated at: ${outputPath}`);
}

generateImage().catch((err) => {
	console.error("Error generating image:", err);
	process.exit(1);
});
