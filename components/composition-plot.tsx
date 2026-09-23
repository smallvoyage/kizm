"use client"

import { useEffect, useId, useRef, useState } from "react"
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts"

import { ChartTooltip } from "@/components/ui/chart"
import type { BodyCompositionMetric, FitnessLog } from "@/lib/fitness"
import {
  COMPOSITION_EDGE_SPACE,
  getCompositionDateAt,
  getCompositionPointX,
  getCompositionWidth,
} from "@/lib/fitness/body-composition"
import { formatNumber } from "@/lib/format-number"

const HEIGHT = 232
const TOP = 16
const BOTTOM = 38

function formatAxisDate(date: string) {
  const [, month, day] = date.split("-")
  return `${Number(month)}/${Number(day)}`
}

type CompositionPlotProps = {
  logs: FitnessLog[]
  selectableLogs: FitnessLog[]
  selectedLog: FitnessLog
  metric: BodyCompositionMetric
  color: string
  label: string
  ticks: number[]
  onSelect: (date: string) => void
}

export function CompositionPlot({
  logs,
  selectableLogs,
  selectedLog,
  metric,
  color,
  label,
  ticks,
  onSelect,
}: CompositionPlotProps) {
  const helpId = useId()
  const scroller = useRef<HTMLElement>(null)
  const [viewportWidth, setViewportWidth] = useState(240)
  const pointerStart = useRef<{ x: number; y: number } | null>(null)
  const suppressClick = useRef(false)
  const lastScroll = useRef(0)
  const width = getCompositionWidth(logs.length, viewportWidth)

  useEffect(() => {
    const element = scroller.current
    if (!element) return
    const observer = new ResizeObserver(() =>
      setViewportWidth(element.clientWidth)
    )
    observer.observe(element)
    setViewportWidth(element.clientWidth)
    return () => observer.disconnect()
  }, [])

  // Selection changes (including period/metric changes) bring only the selected
  // point into view. Ordinary scrolling never changes or recenters selection.
  useEffect(() => {
    const element = scroller.current
    if (!element || selectedLog[metric] === null) return
    const selectedIndex = logs.findIndex((log) => log.date === selectedLog.date)
    const selectedX = getCompositionPointX(selectedIndex, logs.length, width)
    if (
      selectedX < element.scrollLeft + COMPOSITION_EDGE_SPACE ||
      selectedX > element.scrollLeft + viewportWidth - COMPOSITION_EDGE_SPACE
    ) {
      element.scrollLeft = selectedX - viewportWidth + COMPOSITION_EDGE_SPACE
      if (selectedX < element.scrollLeft + COMPOSITION_EDGE_SPACE) {
        element.scrollLeft = selectedX - COMPOSITION_EDGE_SPACE
      }
    }
  }, [selectedLog, viewportWidth, width, logs, metric])

  return (
    <div className="composition-plot">
      <div className="composition-plot-frame">
        <svg
          className="composition-fixed-axis"
          width="48"
          height={HEIGHT}
          aria-hidden="true"
        >
          {ticks.map((value, index) => (
            <text
              key={value}
              x="40"
              y={
                HEIGHT -
                BOTTOM -
                (index / (ticks.length - 1)) * (HEIGHT - TOP - BOTTOM)
              }
              textAnchor="end"
              dominantBaseline="central"
            >
              {formatNumber(value, { fractionDigits: 1, fixed: true })}
            </text>
          ))}
        </svg>
        <section
          ref={scroller}
          className="composition-scroll"
          aria-label={`${label}のグラフ`}
          aria-describedby={helpId}
          onScroll={() => {
            lastScroll.current = performance.now()
          }}
          onPointerDownCapture={(event) => {
            pointerStart.current = { x: event.clientX, y: event.clientY }
            suppressClick.current = performance.now() - lastScroll.current < 150
          }}
          onPointerMoveCapture={(event) => {
            const start = pointerStart.current
            if (
              start &&
              Math.hypot(event.clientX - start.x, event.clientY - start.y) > 8
            ) {
              suppressClick.current = true
            }
          }}
          onPointerCancelCapture={() => {
            suppressClick.current = true
            pointerStart.current = null
          }}
          onPointerUpCapture={() => {
            pointerStart.current = null
          }}
          onKeyDownCapture={(event) => {
            const index = selectableLogs.findIndex(
              (log) => log.date === selectedLog.date
            )
            const next = {
              ArrowLeft: index - 1,
              ArrowRight: index + 1,
              Home: 0,
              End: selectableLogs.length - 1,
            }[event.key]
            if (next === undefined) return
            event.preventDefault()
            event.stopPropagation()
            const candidate = selectableLogs[next]
            if (candidate) onSelect(candidate.date)
          }}
        >
          <LineChart
            width={width}
            height={HEIGHT}
            data={logs}
            accessibilityLayer
            aria-label={`${label}の測定日を選択`}
            aria-describedby={helpId}
            margin={{
              top: TOP,
              right: COMPOSITION_EDGE_SPACE,
              bottom: 8,
              left: COMPOSITION_EDGE_SPACE,
            }}
            onClick={({ activeLabel }) => {
              if (suppressClick.current || typeof activeLabel !== "string")
                return
              const date = getCompositionDateAt(logs, metric, activeLabel)
              if (date) onSelect(date)
            }}
          >
            <CartesianGrid vertical={false} stroke="var(--color-rule)" />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tickMargin={12}
              minTickGap={16}
              height={30}
              tickFormatter={formatAxisDate}
            />
            <YAxis
              hide
              domain={[ticks[0], ticks[ticks.length - 1]]}
              ticks={ticks}
              allowDataOverflow
            />
            <ChartTooltip trigger="click" cursor={false} content={() => null} />
            <Line
              dataKey={metric}
              type="monotone"
              isAnimationActive={false}
              stroke={color}
              strokeWidth={2.5}
              dot={{
                r: 3.5,
                fill: color,
                stroke: "var(--background)",
                strokeWidth: 2,
              }}
              activeDot={false}
              connectNulls
            />
            <ReferenceLine
              x={selectedLog.date}
              stroke={color}
              strokeDasharray="3 4"
            />
            <ReferenceDot
              x={selectedLog.date}
              y={selectedLog[metric] ?? undefined}
              r={5.5}
              fill={color}
              stroke="var(--background)"
              strokeWidth={3}
            />
          </LineChart>
        </section>
      </div>
      <p id={helpId} className="composition-scroll-help">
        横にスクロールして、タップで測定日を選択
        <span className="sr-only">
          。キーボードでは左右矢印キーで選択、Home・Endキーで最初・最後の記録へ移動できます。
        </span>
      </p>
    </div>
  )
}
