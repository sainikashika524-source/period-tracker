import { useRef } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { Copy, Download, Printer } from 'lucide-react'
import { toast } from 'sonner'
import { HeartMark } from '../components/Brand'
import { Button, Card, PageHeader } from '../components/ui'

export default function Share() {
  const url = window.location.origin
  const wrap = useRef<HTMLDivElement>(null)

  function downloadPng() {
    const canvas = wrap.current?.querySelector('canvas')
    if (!canvas) return
    const a = document.createElement('a')
    a.href = canvas.toDataURL('image/png')
    a.download = 'periodwise-qr.png'
    a.click()
  }

  return (
    <div className="mx-auto max-w-[1000px] px-4 py-12 sm:px-6 sm:py-16">
      <PageHeader title="Share via QR" sub="Put this on a slide or poster at an awareness session — people scan it to open PeriodWise on their phone." />
      <div className="grid items-start gap-8 md:grid-cols-[1fr_320px]">
        {/* printable poster */}
        <div id="poster" className="relative overflow-hidden rounded-[36px] bg-plum p-8 text-white shadow-rose sm:p-12 print:shadow-none">
          <div className="pointer-events-none absolute -top-24 -left-24 size-80 rounded-full bg-rose opacity-50 blur-3xl" />
          <div className="pointer-events-none absolute -right-24 -bottom-24 size-80 rounded-full bg-lav opacity-50 blur-3xl" />
          <div className="relative flex flex-col items-center text-center">
            <span className="grid size-14 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/20">
              <HeartMark size={28} />
            </span>
            <h2 className="mt-5 text-3xl font-bold sm:text-4xl">
              Understand your <span className="accent text-[#ffb59e]">cycle.</span>
            </h2>
            <p className="mt-2 text-white/75">Free menstrual health guide, myths quiz & period tracker.</p>
            <div ref={wrap} className="mt-8 rounded-[28px] bg-white p-5">
              <QRCodeCanvas value={url} size={220} level="M" fgColor="#2A1420" marginSize={0} imageSettings={{ src: '/favicon.svg', height: 44, width: 44, excavate: true }} />
            </div>
            <p className="mt-6 font-mono text-sm tracking-wide text-white/80">{url.replace(/^https?:\/\//, '')}</p>
          </div>
        </div>
        <Card className="space-y-3 p-6 print:hidden">
          <Button className="w-full" onClick={downloadPng}>
            <Download size={17} /> Download QR (PNG)
          </Button>
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => navigator.clipboard.writeText(url).then(() => toast.success('Link copied.'), () => toast.error('Couldn’t copy — select the link and copy it manually.'))}
          >
            <Copy size={17} /> Copy link
          </Button>
          <Button variant="secondary" className="w-full" onClick={() => window.print()}>
            <Printer size={17} /> Print poster
          </Button>
          <p className="pt-2 text-sm text-muted">Tip: ask people to take the quiz as “Before a session” at the start and “After a session” at the end — the Home page shows the difference.</p>
        </Card>
      </div>
    </div>
  )
}
