import { CycleRing } from '../components/CycleRing'
import { ButtonLink } from '../components/ui'

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-20 text-center">
      <CycleRing mode="orbit" size={200} loopMs={14000} showTicks={false} center={() => <span className="font-mono text-3xl font-medium">404</span>} />
      <h1 className="mt-8 text-3xl font-bold">This page is off-cycle</h1>
      <p className="mt-2 text-muted">The link may be old or mistyped. Head home and pick up where you left off.</p>
      <ButtonLink to="/" className="mt-7">
        Go to home
      </ButtonLink>
    </div>
  )
}
