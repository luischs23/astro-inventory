"use client";

import React from "react";
import { Lock, ArrowLeft } from "lucide-react";
import { Button } from "./ui/Button"; // Ajusta la ruta según tu estructura

const Unauthorized1: React.FC = () => {
  const handleGoBack = () => {
    window.history.back(); // Vuelve a la página anterior
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 text-center">
        {/* Icono de candado */}
        <div className="flex justify-center mb-4">
          <Lock className="h-16 w-16 text-red-500 dark:text-red-400" />
        </div>

        {/* Título */}
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Access Denied
        </h1>

        {/* Mensaje */}
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          You don’t have permission to view this page. Please contact an administrator if you believe this is an error.
        </p>

        {/* Botón de regresar */}
        <Button
          onClick={handleGoBack}
          className="flex items-center gap-2 mx-auto bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:hover:bg-blue-600"
        >
          <ArrowLeft className="h-5 w-5" />
          Go Back
        </Button>

        {/* Enlace opcional al inicio */}
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          Or return to{" "}
          <a href="/" className="text-blue-600 dark:text-blue-400 hover:underline">
            Home
          </a>
        </p>
      </div>
    </div>
  );
};

export default Unauthorized1;