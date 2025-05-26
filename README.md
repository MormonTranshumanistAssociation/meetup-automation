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

## Setting up dev environment

Make sure that you add the appropriate environment variables to your `.env` file
in order to test this in a staging environment. You can see an example of what
variables need to be set in `.env.example`.

This assumes that [pnpm](https://pnpm.io/) has already been installed in your
global environment.

```bash
pnpm i
```

## Testing

You can run the image generation script as follows:

```bash
pnpm run generate:image
```

The result will be in the `output` folder