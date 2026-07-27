import { Act } from './Act'

/**
 * Act 02. The climb.
 *
 * One orienting line. An earlier version had an altitude readout here; it was
 * invented telemetry corresponding to nothing, which is costume, not craft.
 */
export function Ascent() {
  return (
    <Act id="ascent" screens={1.7} className="ascent">
      <div className="ascent__inner">
        <p className="ascent__line reveal">Building for web and mobile since 2019.</p>
      </div>
    </Act>
  )
}
