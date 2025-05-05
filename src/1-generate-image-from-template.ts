/// <reference types="@cloudflare/workers-types" />

interface CloudflareImageUploadResult {
	result: {
		id: string;
		filename: string;
		uploaded: string;
		requireSignedURLs: boolean;
		variants: string[];
	};
	success: boolean;
	errors: CloudflareError[];
	messages: CloudflareMessage[];
}

interface CloudflareDirectUploadResult {
	result: {
		id: string;
		uploadURL: string;
	};
	success: boolean;
	errors: CloudflareError[];
	messages: CloudflareMessage[];
}

interface CloudflareError {
	code: number;
	message: string;
}

interface CloudflareMessage {
	code: number;
	message: string;
}

export interface Env {
	CLOUDFLARE_ACCOUNT_ID: string;
	CLOUDFLARE_API_TOKEN: string;
}

export default {
	async fetch(
		request: Request,
		env: Env,
		ctx: ExecutionContext,
	): Promise<Response> {
		try {
			// In development, use the local mock service
			const imagesApiBase =
				process.env.NODE_ENV === "development"
					? "http://localhost:3030"
					: "https://api.cloudflare.com/client/v4";

			// Create a direct upload URL for each image
			const createDirectUpload = async (filename: string) => {
				const response = await fetch(
					`${imagesApiBase}/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/images/v2/direct_upload`,
					{
						method: "POST",
						headers: {
							Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
							"Content-Type": "application/json",
						},
						body: JSON.stringify({ metadata: { filename } }),
					},
				);
				const data = (await response.json()) as CloudflareDirectUploadResult;
				return data.result;
			};

			// Upload images using direct upload URLs
			const [portraitUpload, logoUpload, bgUpload] = await Promise.all([
				createDirectUpload("carl-portrait.jpeg"),
				createDirectUpload("mta-logo-grey.png"),
				createDirectUpload("galaxy-background.jpg"),
			]);

			// Upload the actual images
			await Promise.all([
				fetch(portraitUpload.uploadURL, {
					method: "POST",
					body: await fetch("assets/carl-portrait.jpeg").then((r) => r.blob()),
				}),
				fetch(logoUpload.uploadURL, {
					method: "POST",
					body: await fetch("assets/mta-logo-grey.png").then((r) => r.blob()),
				}),
				fetch(bgUpload.uploadURL, {
					method: "POST",
					body: await fetch("assets/galaxy-background.jpg").then((r) =>
						r.blob(),
					),
				}),
			]);

			// Get the processed images with their respective variants
			const portrait = await fetch(
				`${imagesApiBase}/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/images/v1/${portraitUpload.id}/variant/portrait_300_400`,
			);
			const logo = await fetch(
				`${imagesApiBase}/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/images/v1/${logoUpload.id}/variant/logo_200_auto`,
			);
			const background = await fetch(
				`${imagesApiBase}/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/images/v1/${bgUpload.id}/variant/background_1920_1080`,
			);

			// For local development, we'll return the background image
			// In production, you would use Cloudflare Images' composition features
			return new Response(await background.blob(), {
				headers: {
					"Content-Type": "image/jpeg",
					"Cache-Control": "public, max-age=31536000",
				},
			});
		} catch (error) {
			console.error("Error processing image:", error);
			return new Response(
				`Error processing image: ${error instanceof Error ? error.message : "Unknown error"}`,
				{ status: 500 },
			);
		}
	},
};
