"use client";

import { Pie, PieChart } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

type ExpenseCategory = {
  category: string;
  amount: number;
};

type ExpenseCategoryChartProps = {
  data: ExpenseCategory[];
};

const COLORS = ["#3b82f6", "#f43f5e", "#10b981", "#f59e0b", "#8b5cf6", "#64748b"];

const formatIdr = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

export function ExpenseCategoryChart({ data }: ExpenseCategoryChartProps) {
  const sorted = [...data].sort((a, b) => b.amount - a.amount);
  const total = sorted.reduce((sum, item) => sum + item.amount, 0);
  const chartData = sorted.map((item, index) => {
    const key = `cat_${index + 1}`;
    return {
      ...item,
      key,
      fill: `var(--color-${key})`,
      percentage: total > 0 ? Math.round((item.amount / total) * 100) : 0,
    };
  });

  const chartConfig: ChartConfig = chartData.reduce(
    (acc, item, index) => {
      acc[item.key] = {
        label: item.category,
        color: COLORS[index % COLORS.length],
      };
      return acc;
    },
    {
      amount: {
        label: "Nominal",
      },
    } as ChartConfig
  );

  return (
    <Card className="mt-4 rounded-3xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
      <CardHeader className="pb-1">
        <CardTitle className="text-base text-slate-900">Kategori Pengeluaran</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length ? (
          <>
            <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[220px] w-full">
              <PieChart>
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      hideLabel
                      formatter={(value) => formatIdr(Number(value))}
                    />
                  }
                />
                <Pie
                  data={chartData}
                  dataKey="amount"
                  nameKey="category"
                  innerRadius={55}
                  outerRadius={82}
                  strokeWidth={4}
                  labelLine={false}
                />
              </PieChart>
            </ChartContainer>

            <div className="mt-2 space-y-2">
              {chartData.map((item) => (
                <div key={item.key} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-slate-700">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: chartConfig[item.key]?.color as string }} />
                    <span>{item.category}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-800">{item.percentage}%</p>
                    <p className="text-[11px] text-slate-500">{formatIdr(item.amount)}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-500">Belum ada pengeluaran di bulan ini.</p>
        )}
      </CardContent>
    </Card>
  );
}
