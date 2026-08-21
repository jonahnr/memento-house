import {Dashboard} from "./dashboard";import {AuthGate} from "./auth-gate";export default function Page(){return <AuthGate><Dashboard/></AuthGate>}
