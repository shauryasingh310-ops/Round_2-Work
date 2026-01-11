"use client"
import { useEffect, useRef, useState } from "react"
import { useTheme } from "next-themes"

class Particle {
    x: number
    y: number
    speed: number
    amplitude: number
    frequency: number
    phase: number

    constructor(width: number, height: number) {
        this.x = Math.random() * width
        this.y = Math.random() * height
        this.speed = Math.random() * 0.5 + 0.2
        this.amplitude = Math.random() * 20 + 10
        this.frequency = Math.random() * 0.01 + 0.005
        this.phase = Math.random() * Math.PI * 2
    }

    update(width: number, height: number) {
        this.x += this.speed
        if (this.x > width) {
            this.x = 0
        }
        this.y += Math.sin(this.x * this.frequency + this.phase) * 0.5
        if (this.y > height) this.y = 0
        if (this.y < 0) this.y = height
    }

    draw(ctx: CanvasRenderingContext2D) {
        ctx.beginPath()
        ctx.fillStyle = "rgba(200, 255, 255, 0.4)" // Soft glow
        ctx.arc(this.x, this.y, Math.random() * 2 + 1, 0, Math.PI * 2)
        ctx.fill()
    }
}

export const WavyBackground = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [context, setContext] = useState<CanvasRenderingContext2D | null>(null)
    const { theme } = useTheme()

    useEffect(() => {
        if (canvasRef.current) {
            const ctx = canvasRef.current.getContext("2d")
            setContext(ctx)
        }
    }, [])

    useEffect(() => {
        let animationFrameId: number

        if (context && canvasRef.current) {
            const canvas = canvasRef.current
            const { innerWidth, innerHeight } = window
            canvas.width = innerWidth
            canvas.height = innerHeight

            const particles: Particle[] = []
            const particleCount = 100

            for (let i = 0; i < particleCount; i++) {
                particles.push(new Particle(canvas.width, canvas.height))
            }

            const drawWave = (yOffset: number, amplitude: number, frequency: number, phase: number, color: string) => {
                if (!context) return;
                context.beginPath();
                context.moveTo(0, canvas.height / 2 + yOffset);
                for (let i = 0; i < canvas.width; i++) {
                    context.lineTo(i, canvas.height / 2 + yOffset + Math.sin(i * frequency + phase) * amplitude);
                }
                context.strokeStyle = color;
                context.lineWidth = 1;
                context.stroke();

            }

            let phase = 0;

            const render = () => {
                context.clearRect(0, 0, canvas.width, canvas.height)

                // Draw particles
                context.shadowBlur = 10; // Slightly reduced glow
                context.shadowColor = "rgba(100, 200, 255, 0.4)";

                particles.forEach(particle => {
                    particle.update(canvas.width, canvas.height)
                    particle.draw(context)
                })

                // Draw Mesh/Waves
                phase += 0.005;
                context.shadowBlur = 0;

                // Multiple waves for mesh effect - Balanced opacity
                for (let i = 0; i < 5; i++) {
                    const yOffset = (i - 2) * 40;
                    const amplitude = 30 + i * 5;
                    const frequency = 0.003 + i * 0.001;
                    drawWave(yOffset, amplitude, frequency, phase + i, `rgba(100, 116, 255, ${0.15 - i * 0.01})`); // Balanced Indigo
                }

                for (let i = 0; i < 5; i++) {
                    const yOffset = (i - 2) * 50;
                    const amplitude = 25 + i * 8;
                    const frequency = 0.002 + i * 0.002;
                    drawWave(yOffset, amplitude, frequency, phase + i + 2, `rgba(200, 255, 255, ${0.1 - i * 0.01})`); // Balanced Cyan/White
                }

                animationFrameId = requestAnimationFrame(render)
            }
            render()

            const handleResize = () => {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
            }
            window.addEventListener('resize', handleResize);

            return () => {
                window.removeEventListener('resize', handleResize);
                cancelAnimationFrame(animationFrameId)
            }
        }
    }, [context, theme])

    return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0 blur-[3px]" />
}
