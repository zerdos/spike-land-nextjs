'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export default function TestEnhancementPage() {
  const [file, setFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [tokenBalance, setTokenBalance] = useState<number | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(selectedFile)
    }
  }

  const fetchTokenBalance = async () => {
    try {
      const response = await fetch('/api/tokens/balance')
      if (response.ok) {
        const data = await response.json()
        setTokenBalance(data.balance)
      }
    } catch (error) {
      console.error('Error fetching token balance:', error)
    }
  }

  const analyzeImage = async () => {
    if (!file) return

    setAnalyzing(true)
    setResult(null)

    try {
      const reader = new FileReader()
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(',')[1]

        const response = await fetch('/api/test-gemini', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageData: base64,
            mimeType: file.type,
          }),
        })

        if (response.ok) {
          const data = await response.json()
          setResult(JSON.stringify(data, null, 2))
        } else {
          const error = await response.json()
          setResult(`Error: ${error.error}`)
        }
      }
      reader.readAsDataURL(file)
    } catch (error) {
      setResult(`Error: ${error}`)
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Test Image Enhancement</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Upload Image</h2>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="mb-4"
          />
          {imagePreview && (
            <div className="mt-4">
              <img
                src={imagePreview}
                alt="Preview"
                className="max-w-full h-auto rounded-lg"
              />
            </div>
          )}
          <div className="mt-4 space-y-2">
            <Button
              onClick={analyzeImage}
              disabled={!file || analyzing}
              className="w-full"
            >
              {analyzing ? 'Analyzing...' : 'Analyze with Gemini'}
            </Button>
            <Button onClick={fetchTokenBalance} variant="outline" className="w-full">
              Check Token Balance
            </Button>
          </div>
          {tokenBalance !== null && (
            <div className="mt-4 p-3 bg-blue-50 rounded">
              <p className="font-medium">Token Balance: {tokenBalance}</p>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Analysis Result</h2>
          {result ? (
            <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
              {result}
            </pre>
          ) : (
            <p className="text-gray-500">
              Upload an image and click &quot;Analyze with Gemini&quot; to see results
            </p>
          )}
        </Card>
      </div>
    </div>
  )
}
