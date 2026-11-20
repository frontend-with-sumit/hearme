import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Calendar, Check } from "lucide-react";

import { Icon, type IconSize } from "./icon";

const meta = {
  title: "Primitives/Icon",
  component: Icon,
  parameters: { layout: "padded" },
} satisfies Meta<typeof Icon>;

export default meta;
type Story = StoryObj<typeof meta>;

const SIZES: IconSize[] = [16, 18, 20, 22, 28];

export const FigmaSizes: Story = {
  args: { icon: Calendar },
  render: () => (
    <div className="flex items-end gap-4">
      {SIZES.map((size) => (
        <Icon key={size} icon={Calendar} size={size} />
      ))}
    </div>
  ),
};

export const WithLabel: Story = {
  args: { icon: Check, label: "Confirmed" },
};
