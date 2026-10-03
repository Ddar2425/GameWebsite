import Link from 'next/link';
export default function NotFound(){return <main className="not-found"><h1>That game wandered off.</h1><p>The page you requested doesn’t exist.</p><Link className="primary-button" href="/games">Find another game</Link></main>}
