import { BrowserRouter, Routes, Route } from "react-router"

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<div>Home</div>} />
      </Routes>
    </BrowserRouter>
  )
}
