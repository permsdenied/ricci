import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Bot, AlertCircle } from "lucide-react";

function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await login(email, password); // ← ВОТ ТУТ БЫЛ БАГ: не было await
      toast.success("Успешный вход!");
      navigate("/dashboard"); // ← теперь сюда попадаем ТОЛЬКО при успехе
    } catch (err: any) {
      console.error("Login error:", err);

      let errorMessage = "Ошибка авторизации";

      if (err.response) {
        const status = err.response.status;
        const serverMessage =
          err.response.data?.error?.message || err.response.data?.message;

        if (status === 401) {
          errorMessage = "Неверный email или пароль";
        } else if (status === 403) {
          errorMessage = "Доступ запрещён";
        } else if (status >= 500) {
          errorMessage = "Ошибка сервера. Попробуйте позже";
        } else if (serverMessage) {
          errorMessage = serverMessage;
        }
      } else if (err.code === "ERR_NETWORK") {
        errorMessage = "Нет связи с сервером";
      }

      setError(errorMessage);
      toast.error(errorMessage);
      // ← navigate НЕ вызывается, остаёмся на странице логина
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary rounded-full">
              <Bot className="w-8 h-8 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl">Ricci Internal Bot</CardTitle>
          <CardDescription>Войдите в панель администратора</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@ricci.ru"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                type="password"
                placeholder="Введите пароль"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                required
                disabled={loading}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Вход..." : "Войти"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default LoginPage;
