import { getBaseURL } from "@lib/util/env"
import { Metadata } from "next"
import "styles/globals.css"
import { config } from "@fortawesome/fontawesome-svg-core"
import "@fortawesome/fontawesome-svg-core/styles.css"
import NavigationProgress from "@modules/common/components/navigation-progress"

config.autoAddCss = false;

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
  icons: {
    icon: "/favicon-32x32.avif",
  },
}

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="en" data-mode="light">
      <body>
        <NavigationProgress />
        <main className="relative">{props.children}</main>
      </body>
    </html>
  )
}
