import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, PieChart as PieChartIcon } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { useAttendanceRecords, useVillageStats } from "../hooks/useQueries";

// Vibrant color palette for bar chart (blue, green, orange, purple hues)
const BAR_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#a855f7",
  "#06b6d4",
  "#ec4899",
  "#84cc16",
  "#f97316",
];

// Contrasting pastel colors for pie chart
const PIE_COLORS = ["#93c5fd", "#86efac", "#fde68a", "#f9a8d4", "#c4b5fd"];

export default function AttendanceCharts() {
  const { data: records = [], isLoading: recordsLoading } =
    useAttendanceRecords();
  const { data: villageStats = [], isLoading: statsLoading } =
    useVillageStats();

  const isLoading = recordsLoading || statsLoading;

  const villageData = villageStats.map(([village, count], index) => ({
    village,
    count: Number(count),
    fill: BAR_COLORS[index % BAR_COLORS.length],
  }));

  const ageGroups = [
    { name: "0-20 tahun", min: 0, max: 20 },
    { name: "21-30 tahun", min: 21, max: 30 },
    { name: "31-40 tahun", min: 31, max: 40 },
    { name: "41-50 tahun", min: 41, max: 50 },
    { name: "51+ tahun", min: 51, max: 255 },
  ];

  const ageGroupData = ageGroups
    .map((group, index) => {
      const count = records.filter(
        (record) => record.usia >= group.min && record.usia <= group.max,
      ).length;
      return {
        name: group.name,
        value: count,
        fill: PIE_COLORS[index % PIE_COLORS.length],
      };
    })
    .filter((group) => group.value > 0);

  const barChartConfig = villageData.reduce(
    (config, item, index) => {
      config[item.village] = {
        label: item.village,
        color: BAR_COLORS[index % BAR_COLORS.length],
      };
      return config;
    },
    {} as Record<string, { label: string; color: string }>,
  );

  const pieChartConfig = ageGroupData.reduce(
    (config, item, index) => {
      config[item.name] = {
        label: item.name,
        color: PIE_COLORS[index % PIE_COLORS.length],
      };
      return config;
    },
    {} as Record<string, { label: string; color: string }>,
  );

  if (isLoading) {
    return (
      <section className="bg-card rounded-lg border shadow-sm p-6">
        <div className="mb-6">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      </section>
    );
  }

  if (records.length === 0) {
    return null;
  }

  return (
    <section className="bg-card rounded-lg border shadow-sm p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-foreground mb-2">
          Statistik Kehadiran
        </h2>
        <p className="text-muted-foreground text-sm">
          Visualisasi data kehadiran berdasarkan desa dan kelompok usia
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Peserta per Desa
            </CardTitle>
            <CardDescription>Jumlah peserta dari setiap desa</CardDescription>
          </CardHeader>
          <CardContent>
            {villageData.length > 0 ? (
              <ChartContainer config={barChartConfig} className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={villageData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-muted"
                    />
                    <XAxis
                      dataKey="village"
                      className="text-xs"
                      tick={{ fill: "hsl(var(--foreground))" }}
                    />
                    <YAxis
                      className="text-xs"
                      tick={{ fill: "hsl(var(--foreground))" }}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar dataKey="count" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Belum ada data
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5" />
              Distribusi Kelompok Usia
            </CardTitle>
            <CardDescription>
              Pembagian peserta berdasarkan kelompok usia
            </CardDescription>
          </CardHeader>
          <CardContent>
            {ageGroupData.length > 0 ? (
              <ChartContainer config={pieChartConfig} className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={ageGroupData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name}: ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={80}
                      dataKey="value"
                    >
                      {ageGroupData.map((entry) => (
                        <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Belum ada data
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
