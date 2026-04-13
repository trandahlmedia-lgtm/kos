'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface ContentVelocityChartProps {
  data: { week: string; count: number }[]
}

export function ContentVelocityChart({ data }: ContentVelocityChartProps) {
  return (
    <section>
      <h3 className="text-xs font-semibold text-[#555555] uppercase tracking-wider mb-3">
        Content Velocity
      </h3>
      <div className="bg-[#111111] border border-[#2a2a2a] rounded-md p-4">
        {data.every((d) => d.count === 0) ? (
          <p className="text-sm text-[#555555] text-center py-6">No published posts in the last 8 weeks</p>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="velocityGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#E8732A" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#E8732A" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="week"
                tick={{ fill: '#555555', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: '#555555', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={28}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1a1a1a',
                  border: '1px solid #2a2a2a',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: 12,
                }}
                labelStyle={{ color: '#999999' }}
                cursor={{ stroke: '#2a2a2a' }}
                formatter={(value) => [value, 'Posts']}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#E8732A"
                strokeWidth={2}
                fill="url(#velocityGradient)"
                dot={false}
                activeDot={{ r: 4, fill: '#E8732A', strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  )
}
