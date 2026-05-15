import { Link } from "@tanstack/react-router";
import { Menu, BookOpen, Bookmark, User, Settings, Layers, Info, LogIn, HelpCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          to="/"
          className="text-lg sm:text-xl font-bold tracking-tight text-foreground hover:text-primary transition-colors"
        >
          Actually.Studz <span aria-hidden>🤓</span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            to="/auth"
            className="hidden sm:inline-flex text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
          >
            Sign in
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Open menu"
                className="rounded-full hover:bg-secondary"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Menu</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/flashcards" className="flex items-center gap-2 cursor-pointer">
                  <Layers className="h-4 w-4" /> Flashcards
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/saved" className="flex items-center gap-2 cursor-pointer">
                  <Bookmark className="h-4 w-4" /> Saved Notes
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/saved-quizzes" className="flex items-center gap-2 cursor-pointer">
                  <HelpCircle className="h-4 w-4" /> Saved Quizzes
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/profile" className="flex items-center gap-2 cursor-pointer">
                  <User className="h-4 w-4" /> Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/settings" className="flex items-center gap-2 cursor-pointer">
                  <Settings className="h-4 w-4" /> Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/auth" className="flex items-center gap-2 cursor-pointer">
                  <LogIn className="h-4 w-4" /> Sign in / Sign up
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/about" className="flex items-center gap-2 cursor-pointer">
                  <Info className="h-4 w-4" /> About
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
