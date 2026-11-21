import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { CalendarDays, Video } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "./alert";
import { Button } from "./button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./card";
import { Pill } from "./pill";
import { Separator } from "./separator";
import { StatusBadge } from "./status-badge";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./table";

const meta = {
  title: "Primitives/Display",
  parameters: { layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Pills: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <Pill>Anonymous by default</Pill>
      <Pill icon={Video}>Google Meet</Pill>
      <Pill icon={CalendarDays}>Evenings and weekends</Pill>
    </div>
  ),
};

export const StatusBadges: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <StatusBadge tone="success">Paid</StatusBadge>
      <StatusBadge tone="warning">Awaiting payment</StatusBadge>
      <StatusBadge tone="danger">Calendar</StatusBadge>
      <StatusBadge tone="neutral">Hold expired</StatusBadge>
    </div>
  ),
};

export const Cards: Story = {
  render: () => (
    <div className="flex max-w-md flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Upcoming sessions</CardTitle>
          <CardDescription>Your next three bookings.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-body-small">No sessions yet.</p>
        </CardContent>
        <CardFooter>
          <Button size="sm" variant="outline">
            View all
          </Button>
        </CardFooter>
      </Card>
      <Card
        radius="feature"
        padding="lg"
        className="shadow-[var(--shadow-float)]"
      >
        <CardTitle className="font-serif">A feature card</CardTitle>
        <CardDescription>
          The 22px radius and the floating shadow.
        </CardDescription>
      </Card>
    </div>
  ),
};

export const Alerts: Story = {
  render: () => (
    <div className="flex max-w-md flex-col gap-3">
      <Alert tone="info">
        <AlertDescription>
          Sessions happen on Google Meet and are never recorded.
        </AlertDescription>
      </Alert>
      <Alert tone="warning">
        <AlertTitle>Please note</AlertTitle>
        <AlertDescription>
          This is not a crisis service. If you are in danger, call your local
          helpline.
        </AlertDescription>
      </Alert>
      <Alert tone="danger">
        <AlertTitle>Payment did not go through</AlertTitle>
        <AlertDescription>
          Your slot is held for another 8 minutes.
        </AlertDescription>
      </Alert>
    </div>
  ),
};

export const Separators: Story = {
  render: () => (
    <div className="flex max-w-md flex-col gap-4">
      <p>Above</p>
      <Separator />
      <p>Below</p>
      <div className="flex h-8 items-center gap-4">
        <span>Left</span>
        <Separator orientation="vertical" />
        <span>Right</span>
      </div>
    </div>
  ),
};

/** Cell padding leaves room for the 44px pointer area of a 40px button inside the scroll wrapper. */
export const Tables: Story = {
  render: () => (
    <Table>
      <TableCaption>Upcoming appointments</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>When</TableHead>
          <TableHead>Length</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>Sat 12 Dec, 6:00 pm</TableCell>
          <TableCell>60 min</TableCell>
          <TableCell>
            <StatusBadge tone="success">Paid</StatusBadge>
          </TableCell>
          <TableCell className="py-3">
            <Button size="sm" variant="outline">
              Open
            </Button>
          </TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Sun 13 Dec, 11:00 am</TableCell>
          <TableCell>30 min</TableCell>
          <TableCell>
            <StatusBadge tone="neutral">Hold expired</StatusBadge>
          </TableCell>
          <TableCell className="py-3">
            <Button size="sm" variant="outline">
              Open
            </Button>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ),
};
