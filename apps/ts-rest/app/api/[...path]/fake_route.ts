import {NextRequest, NextResponse} from "next/server";

export const dynamicParams = false;

export function GET(request: NextRequest, {params}: {params: {path: string[]}}) {
  return NextResponse.json({path: params.path});
}

export function generateStaticParams() {
  return [{path: ["users"]}, {path: ["users", "[id]"]}];
}
