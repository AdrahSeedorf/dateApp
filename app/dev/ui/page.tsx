import { notFound } from "next/navigation";
import {
  Button,
  Card,
  Chip,
  ChipGroup,
  Field,
  Pill,
  ProgressRail,
  Screen,
  ScreenHeader,
  Section,
  TextArea,
  Timeline,
  TimelineItem,
} from "@/components/ui";
import ThemeSwitcher from "./ThemeSwitcher";

/**
 * Development-only gallery of every design-system primitive.
 *
 * Exists so the system can be reviewed in one place and in all four themes
 * before screens are built on top of it. A contrast script proves the
 * palettes are legible; this proves they look right together, which is the
 * part a script can't check.
 *
 * Guarded twice, like the other dev routes: middleware treats /dev as
 * non-public outside development, and this returns 404 in production.
 */
export default function UiGalleryPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <Screen>
      <ThemeSwitcher />

      <ScreenHeader
        eyebrow="Design system"
        title={
          <>
            Midnight <em>Romance</em>
          </>
        }
        body="Every primitive, in one place. Switch themes above — nothing here hardcodes a colour."
      />

      <Section title="Buttons">
        <Card className="flex flex-wrap gap-space-sm">
          <Button>Primary action</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Delete</Button>
          <Button size="sm" variant="secondary">
            Small
          </Button>
          <Button disabled>Disabled</Button>
        </Card>
      </Section>

      <Section title="Surfaces">
        <div className="grid gap-space-sm sm:grid-cols-2">
          <Card elevation="flat">
            <p className="text-title-md">Flat</p>
            <p className="text-body-sm text-on-surface-variant">
              Solid. For long lists, where a dozen blurred layers would cost
              frames on a mid-range phone.
            </p>
          </Card>
          <Card elevation="glass">
            <p className="text-title-md">Glass</p>
            <p className="text-body-sm text-on-surface-variant">
              Layer 1. The default card.
            </p>
          </Card>
          <Card elevation="raised" interactive>
            <p className="text-title-md">Raised</p>
            <p className="text-body-sm text-on-surface-variant">
              Layer 2. Hover for the lavender halo.
            </p>
          </Card>
          <Card elevation="float">
            <p className="text-title-md">Float</p>
            <p className="text-body-sm text-on-surface-variant">
              Layer 3. Sheets and popovers.
            </p>
          </Card>
        </div>
      </Section>

      <Section title="Type scale">
        <Card className="space-y-space-sm">
          <p className="font-headline text-display-lg-mobile">Display</p>
          <p className="font-headline text-headline-lg">Headline large</p>
          <p className="font-headline text-headline-md">Headline medium</p>
          <p className="font-headline text-headline-sm">Headline small</p>
          <p className="text-title-lg">Title large</p>
          <p className="text-body-lg">
            Body large — the reading size for letters and journal entries.
          </p>
          <p className="text-body-md text-on-surface-variant">
            Body medium — the interface default.
          </p>
          <p className="text-body-sm text-on-surface-variant">
            Body small — captions and helper text (raised to 14px).
          </p>
          <p className="text-label-sm text-on-surface-variant tracking-[0.15em]">
            LABEL SMALL — RAISED TO 12PX
          </p>
        </Card>
      </Section>

      <Section title="Chips and pills">
        <Card className="space-y-space-md">
          <ChipGroup legend="Interests">
            <Chip name="demo" value="live-music" defaultChecked>
              Live music
            </Chip>
            <Chip name="demo" value="hiking">
              Hiking
            </Chip>
            <Chip name="demo" value="cooking" defaultChecked>
              Cooking
            </Chip>
            <Chip name="demo" value="galleries">
              Galleries
            </Chip>
          </ChipGroup>

          <ChipGroup legend="Vibe (scrolls)" scroll>
            <Chip name="vibe" value="romantic" type="radio" defaultChecked>
              ✨ Romantic &amp; cozy
            </Chip>
            <Chip name="vibe" value="adventurous" type="radio">
              🌲 Adventurous
            </Chip>
            <Chip name="vibe" value="luxe" type="radio">
              🥂 Luxe
            </Chip>
            <Chip name="vibe" value="spontaneous" type="radio">
              🎡 Spontaneous
            </Chip>
          </ChipGroup>

          <div className="flex flex-wrap gap-space-sm">
            <Pill dot tone="primary">
              Synced
            </Pill>
            <Pill tone="secondary">1 new</Pill>
            <Pill tone="tertiary">Year 4</Pill>
            <Pill>Tonight</Pill>
          </div>
        </Card>
      </Section>

      <Section title="Inputs">
        <Card className="space-y-space-md">
          <Field label="Your name" placeholder="Seedorf" />
          <Field
            label="Town or suburb"
            placeholder="Penrith, NSW"
            hint="Close enough to be useful, not so exact it's uncomfortable."
          />
          <Field
            label="Email"
            defaultValue="not-an-email"
            error="That doesn't look like an email address."
          />
          <TextArea
            label="A note"
            rows={3}
            placeholder="Written on a quiet Sunday morning…"
          />
        </Card>
      </Section>

      <Section title="Timeline">
        <Card>
          <ProgressRail
            value={0.88}
            label="Progress through year four"
            className="mb-space-lg"
          />

          <Timeline>
            <TimelineItem>
              <p className="font-headline text-headline-sm text-primary">
                The first spark
              </p>
              <p className="text-label-sm text-on-surface-variant">
                September 18, 2021
              </p>
            </TimelineItem>
            <TimelineItem>
              <p className="font-headline text-headline-sm">Official day</p>
              <p className="text-label-sm text-on-surface-variant">
                October 14, 2021
              </p>
            </TimelineItem>
            <TimelineItem tone="tertiary">
              <Pill tone="tertiary" className="mb-1">
                Upcoming
              </Pill>
              <p className="font-headline text-headline-sm text-tertiary">
                Fourth anniversary
              </p>
              <p className="text-label-sm text-on-surface-variant">
                246 days away
              </p>
            </TimelineItem>
          </Timeline>
        </Card>
      </Section>
    </Screen>
  );
}
