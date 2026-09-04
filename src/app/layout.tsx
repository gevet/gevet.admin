import type {Metadata,Viewport} from "next";
import "./globals.css";

export const metadata:Metadata={
  title:{default:"GeVet | Gestión veterinaria",template:"%s | GeVet"},
  description:"Administración integral para clínicas veterinarias",
  manifest:"/manifest.webmanifest",
  icons:{icon:"/GEVET.svg",apple:"/GEVET.svg"},
};
export const viewport:Viewport={themeColor:"#0c072e",width:"device-width",initialScale:1};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="es"><body>{children}</body></html>}
