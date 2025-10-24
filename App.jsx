import React from 'react';
import { Routes, Route } from "react-router-dom";
import ApplicationView from "./pages/ApplicationView";
import MainLayout from "./layouts/MainLayout";
import ApplicantForm from "./components/Recruitment/ApplicantForm.jsx"; // <-- add this
import GlobalNotifier from "./components/GlobalNotifier.jsx";

function App() {
  return (
    <>
      <GlobalNotifier />
      <Routes>
        {/* 1. The Public Route */}
        <Route path="/application/view/:token" element={<ApplicationView />} />
        {/* 2. Applicant Form Page */}
        <Route path="/apply" element={<ApplicantForm />} />

        {/* 3. The Private/Secure App Routes */}
        <Route path="/*" element={<MainLayout />} />
      </Routes>
    </>
  );
}

export default App;
