"use client";

import { Bar, BarChart, CartesianGrid, Cell, XAxis } from "recharts";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

type WeekCashflowRow = {
  dayKey: string;
  dayLabel: string;
  dayDate: string;
  isToday: boolean;
  income: number;
  expense: number;
};

const chartConfig = {
  income: {
    label: "Pemasukan",
    color: "#0f172a",
  },
  expense: {
    label: "Pengeluaran",
    color: "#94a3b8",
  },
} satisfies ChartConfig;

type WeeklyCashflowChartProps = {
  data: WeekCashflowRow[];
};

export function WeeklyCashflowChart({
  data,
}: WeeklyCashflowChartProps) {
  const chartData = data.map((row) => ({
    ...row,
    xLabel: `${row.dayLabel} ${row.dayDate}`,
  }));
  const tickMap = new Map(chartData.map((row) => [row.dayKey, row]));

  return (
    <Card className="rounded-3xl border border-slate-200 bg-white shadow-[0_10px_28px_rgba(15,23,42,0.08)]">
      <CardContent className="pt-5">
        <ChartContainer config={chartConfig} className="h-64 w-full">
          <BarChart accessibilityLayer data={chartData}>
            <CartesianGrid vertical={false} stroke="#e2e8f0" />
            <XAxis
              dataKey="dayKey"
              tickLine={false}
              tickMargin={12}
              axisLine={false}
              interval={0}
              height={42}
              tick={(props) => {
                const { x, y, payload } = props as {
                  x: number;
                  y: number;
                  payload: { value: string };
                };
                const row = tickMap.get(payload.value);
                if (!row) return <g />;

                return (
                  <g transform={`translate(${x},${y})`}>
                    {row.isToday ? (
                      <rect
                        x={-16}
                        y={1}
                        width={32}
                        height={26}
                        rx={8}
                        fill="#0f172a"
                        fillOpacity={0.16}
                      />
                    ) : null}
                    <text
                      x={0}
                      y={0}
                      dy={10}
                      textAnchor="middle"
                      fill={row.isToday ? "#0f172a" : "#64748b"}
                      fontSize={10}
                      fontWeight={row.isToday ? 700 : 500}
                    >
                      {row.dayLabel}
                    </text>
                    <text
                      x={0}
                      y={0}
                      dy={22}
                      textAnchor="middle"
                      fill={row.isToday ? "#0f172a" : "#94a3b8"}
                      fontSize={10}
                      fontWeight={row.isToday ? 700 : 500}
                    >
                      {row.dayDate}
                    </text>
                  </g>
                );
              }}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  indicator="dashed"
                  labelFormatter={(_, payload) => {
                    const item = payload?.[0]?.payload as { dayLabel?: string; dayDate?: string } | undefined;
                    if (!item?.dayLabel || !item?.dayDate) return "Hari";
                    return `${item.dayLabel} ${item.dayDate}`;
                  }}
                  formatter={(value, name) => (
                    <div className="flex min-w-[160px] items-center justify-between gap-2">
                      <span>{name}</span>
                      <span className="font-semibold">
                        {new Intl.NumberFormat("id-ID", {
                          style: "currency",
                          currency: "IDR",
                          maximumFractionDigits: 0,
                        }).format(Number(value))}
                      </span>
                    </div>
                  )}
                />
              }
            />
            <Bar dataKey="income" fill="var(--color-income)" radius={4}>
              {chartData.map((row) => (
                <Cell
                  key={`income-${row.dayKey}`}
                  fill={row.isToday ? "#020617" : "var(--color-income)"}
                  opacity={row.isToday ? 1 : 0.9}
                />
              ))}
            </Bar>
            <Bar dataKey="expense" fill="var(--color-expense)" radius={4}>
              {chartData.map((row) => (
                <Cell
                  key={`expense-${row.dayKey}`}
                  fill={row.isToday ? "#334155" : "var(--color-expense)"}
                  opacity={row.isToday ? 1 : 0.9}
                />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
