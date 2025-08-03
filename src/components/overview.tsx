"use client"

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"

const data = [
  {
    name: "Jan",
    repositories: 5,
    events: 240,
  },
  {
    name: "Feb",
    repositories: 7,
    events: 320,
  },
  {
    name: "Mar",
    repositories: 8,
    events: 380,
  },
  {
    name: "Apr",
    repositories: 10,
    events: 430,
  },
  {
    name: "May",
    repositories: 11,
    events: 475,
  },
  {
    name: "Jun",
    repositories: 12,
    events: 570,
  },
]

export function Overview() {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data}>
        <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
        <Tooltip />
        <Bar dataKey="events" fill="currentColor" radius={[4, 4, 0, 0]} className="fill-primary" />
      </BarChart>
    </ResponsiveContainer>
  )
}
