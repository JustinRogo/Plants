import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { imageBase64 } = await req.json()

    if (!imageBase64) {
      return new Response(JSON.stringify({ error: 'No image provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Decode base64 data URL into a Blob
    const mimeMatch = imageBase64.match(/^data:([^;]+);base64,/)
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg'
    const base64Data = imageBase64.replace(/^data:[^;]+;base64,/, '')
    const binaryStr = atob(base64Data)
    const bytes = new Uint8Array(binaryStr.length)
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i)
    }
    const file = new File([bytes], 'plant.jpg', { type: mimeType })

    const form = new FormData()
    form.append('images', file)
    form.append('organs', 'auto')

    const apiKey = Deno.env.get('PLANTNET_API_KEY')
    if (!apiKey) {
      console.error('PLANTNET_API_KEY secret is not set')
      return new Response(JSON.stringify({ error: 'PLANTNET_API_KEY not configured — set it with: supabase secrets set PLANTNET_API_KEY=your_key' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const response = await fetch(
      `https://my-api.plantnet.org/v2/identify/all?api-key=${apiKey}&lang=en&nb-results=5`,
      { method: 'POST', body: form }
    )

    const data = await response.json()
    console.log('PlantNet status:', response.status, JSON.stringify(data).slice(0, 200))

    if (!response.ok) {
      return new Response(JSON.stringify({ error: data?.message || `PlantNet returned ${response.status}` }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Return only what the client needs
    const results = (data.results || []).map((r: any) => ({
      score: r.score,
      scientificName: r.species?.scientificName ?? '',
      commonNames: r.species?.commonNames ?? [],
      family: r.species?.family?.scientificName ?? '',
    }))

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
