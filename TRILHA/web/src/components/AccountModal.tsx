import { useEffect, useId, useRef, useState } from "react";
import {
  defaultPhoneCountryIso,
  PHONE_COUNTRY_OPTIONS,
  phoneCountryByIso,
} from "../data/phoneCountries";
import { supabase } from "../supabaseClient";

type Mode = "login" | "signup";

type Props = {
  open: boolean;
  onClose: () => void;
};

function onlyDigits(s: string): string {
  return s.replace(/\D/g, "");
}

function parseBirthDate(isoDate: string): Date | null {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return null;
  const d = new Date(`${isoDate}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function ageFromBirthDate(birth: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age -= 1;
  return age;
}

export function AccountModal({ open, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [nome, setNome] = useState("");
  const [telefonePaisIso, setTelefonePaisIso] = useState(defaultPhoneCountryIso);
  const [telefone, setTelefone] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      setError(null);
      setInfo(null);
    }
    if (!open && d.open) d.close();
  }, [open]);

  useEffect(() => {
    if (!open) {
      setEmail("");
      setNome("");
      setTelefonePaisIso(defaultPhoneCountryIso());
      setTelefone("");
      setDataNascimento("");
      setPassword("");
    }
  }, [open]);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    const onDialogClose = () => {
      onClose();
      setError(null);
      setInfo(null);
      setLoading(false);
    };
    d.addEventListener("close", onDialogClose);
    return () => d.removeEventListener("close", onDialogClose);
  }, [onClose]);

  const validateSignupFields = (): string | null => {
    const n = nome.trim();
    if (n.length < 2) return "Indica o teu nome (pelo menos 2 caracteres).";

    const country = phoneCountryByIso(telefonePaisIso);
    if (!country) return "Escolhe o país do telefone.";
    const national = onlyDigits(telefone).replace(/^0+/, "");
    if (national.length < 8 || national.length > 12) {
      return "Indica o número nacional (só dígitos, sem repetir o indicativo). Entre 8 e 12 dígitos.";
    }
    if (country.dialDigits.length + national.length > 15) {
      return "Combinação país + número demasiado longa. Verifica o número.";
    }

    const birth = parseBirthDate(dataNascimento);
    if (!birth) return "Indica a data de nascimento.";
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (birth > today) return "A data de nascimento não pode ser no futuro.";

    const age = ageFromBirthDate(birth);
    if (age < 13) return "É necessário ter pelo menos 13 anos para te registares.";

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (!supabase) {
      setError("Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env.");
      return;
    }

    const em = email.trim();
    if (!em || password.length < 6) {
      setError("E-mail válido e palavra-passe com pelo menos 6 caracteres.");
      return;
    }

    if (mode === "signup") {
      const signupErr = validateSignupFields();
      if (signupErr) {
        setError(signupErr);
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === "signup") {
        const country = phoneCountryByIso(telefonePaisIso);
        if (!country) {
          setError("Escolhe o país do telefone.");
          return;
        }
        const national = onlyDigits(telefone).replace(/^0+/, "");
        const telefoneE164 = `+${country.dialDigits}${national}`;

        const { data, error: err } = await supabase.auth.signUp({
          email: em,
          password,
          options: {
            data: {
              nome: nome.trim(),
              telefone: telefoneE164,
              telefone_pais_iso: telefonePaisIso,
              data_nascimento: dataNascimento,
            },
          },
        });
        if (err) {
          setError(err.message);
          return;
        }
        if (data.session) {
          dialogRef.current?.close();
          return;
        }
        setNome("");
        setTelefone("");
        setDataNascimento("");
        setTelefonePaisIso(defaultPhoneCountryIso());
        setPassword("");
        setMode("login");
        setInfo(
          "Conta criada. Confirma o e-mail se o Supabase pedir; em seguida entra aqui com o mesmo e-mail e palavra-passe.",
        );
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email: em, password });
        if (err) {
          setError(err.message);
          return;
        }
        dialogRef.current?.close();
      }
    } finally {
      setLoading(false);
    }
  };

  const requestClose = () => dialogRef.current?.close();

  return (
    <dialog ref={dialogRef} className="account-dialog" aria-labelledby={titleId}>
      <div className="account-dialog__panel account-dialog__panel--scroll">
        <header className="account-dialog__head">
          <h2 id={titleId} className="account-dialog__title">
            Conta
          </h2>
          <button type="button" className="account-dialog__close" onClick={requestClose} aria-label="Fechar">
            ×
          </button>
        </header>

        <div className="account-dialog__tabs" role="tablist" aria-label="Modo">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "login"}
            className={`account-dialog__tab${mode === "login" ? " account-dialog__tab--on" : ""}`}
            onClick={() => {
              setMode("login");
              setError(null);
              setInfo(null);
            }}
          >
            Entrar
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "signup"}
            className={`account-dialog__tab${mode === "signup" ? " account-dialog__tab--on" : ""}`}
            onClick={() => {
              setMode("signup");
              setError(null);
              setInfo(null);
            }}
          >
            Cadastrar
          </button>
        </div>

        <form className="account-dialog__form" onSubmit={handleSubmit}>
          <label className="account-field">
            <span className="account-field__label">E-mail</span>
            <input
              className="account-field__input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              required
            />
          </label>

          {mode === "signup" && (
            <>
              <label className="account-field">
                <span className="account-field__label">Nome</span>
                <input
                  className="account-field__input"
                  type="text"
                  autoComplete="name"
                  value={nome}
                  onChange={(ev) => setNome(ev.target.value)}
                  minLength={2}
                  required
                />
              </label>
              <div className="account-field">
                <span className="account-field__label">Telefone</span>
                <div className="account-phone-row">
                  <label className="account-phone-row__dial" htmlFor="account-phone-country">
                    <span className="visually-hidden">País / indicativo</span>
                    <select
                      id="account-phone-country"
                      className="account-field__input account-field__input--dial"
                      value={telefonePaisIso}
                      onChange={(ev) => setTelefonePaisIso(ev.target.value)}
                      aria-label="País do telefone"
                    >
                      {PHONE_COUNTRY_OPTIONS.map((c) => (
                        <option key={c.iso} value={c.iso}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="account-phone-row__num" htmlFor="account-phone-national">
                    <span className="visually-hidden">Número nacional</span>
                    <input
                      id="account-phone-national"
                      className="account-field__input account-field__input--num"
                      type="tel"
                      autoComplete="tel-national"
                      inputMode="numeric"
                      placeholder="Número (sem indicativo)"
                      value={telefone}
                      onChange={(ev) => setTelefone(ev.target.value)}
                      required
                    />
                  </label>
                </div>
              </div>
              <label className="account-field">
                <span className="account-field__label">Data de nascimento</span>
                <input
                  className="account-field__input"
                  type="date"
                  autoComplete="bday"
                  value={dataNascimento}
                  onChange={(ev) => setDataNascimento(ev.target.value)}
                  required
                />
              </label>
            </>
          )}

          <label className="account-field">
            <span className="account-field__label">Palavra-passe</span>
            <input
              className="account-field__input"
              type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              minLength={6}
              required
            />
          </label>

          {error && <p className="account-dialog__msg account-dialog__msg--err">{error}</p>}
          {info && <p className="account-dialog__msg account-dialog__msg--info">{info}</p>}

          <button type="submit" className="account-dialog__submit" disabled={loading}>
            {loading ? "A aguardar…" : mode === "signup" ? "Criar conta" : "Entrar"}
          </button>
        </form>
      </div>
    </dialog>
  );
}
