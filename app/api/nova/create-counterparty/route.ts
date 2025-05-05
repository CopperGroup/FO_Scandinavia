import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, surname, phoneNumber, email } = body

    console.log(name, surname, phoneNumber, email)
    const response = await fetch('https://api.novaposhta.ua/v2.0/json/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: process.env.NOVA_POSHTA_API_KEY,
          modelName: 'CounterpartyGeneral',
          calledMethod: 'save',
          methodProperties: {
            FirstName: name,
            LastName: surname,
            MiddleName: '',
            Email: email,
            Phone: phoneNumber,
            CounterpartyType: 'PrivatePerson',
            CounterpartyProperty: 'Recipient',
          },
        }),
      });      

    if (!response.ok) {
      return NextResponse.json({ error: "Nova Poshta API failed" }, { status: response.status })
    }

    const data = await response.json()
    console.log(data)
    return NextResponse.json(data)
  } catch (error: any) {
    console.error("Error in create-counterparty:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
