"use client";

import * as React from "react";
import { useState, useCallback, useEffect } from "react";
import { debounce } from "lodash";
import { useRouter } from "next/navigation";
import { type DialogProps } from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useEnvironmentStore } from "@/components/context";
import UnlockNow from "@/components/unlock-now";
import { SearchTokenResponse } from "@/lib/types";
import Image from "next/image";
import { IPFS_GATEWAY_URL, IPFS_GATEWAY_URL_4 } from "@/lib/constants";

export function CommandMenu({ ...props }: DialogProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const { paid } = useEnvironmentStore((store) => store);
  const [searchResults, setSearchResults] = useState<SearchTokenResponse[]>([]);
  const { searchBarValue, setSearchBarValue, leaderboard } =
    useEnvironmentStore((store) => store);
  const [searchState, setSearchState] = useState(0);

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || e.key === "/") {
        if (
          (e.target instanceof HTMLElement && e.target.isContentEditable) ||
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement ||
          e.target instanceof HTMLSelectElement
        ) {
          return;
        }

        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = React.useCallback((command: () => unknown) => {
    setOpen(false);
    command();
  }, []);

  const debouncedSearch = useCallback(
    debounce(async (searchTerm: string) => {
      console.log("SEARCH TERM", searchTerm);
      if (searchTerm.length < 2) {
        setSearchResults([]);
        setSearchState(1);
        return;
      }

      try {
        setSearchState(2);
        fetch(`/api/supabase/search-tokens?searchTerm=${searchTerm}`)
          .then((res) => res.json())
          .then((data) => {
            setSearchState(data.length > 0 ? 0 : 1);
            setSearchResults(data);
          });
      } catch (error) {
        console.error("Search failed", error);
        setSearchState(1);
      }
    }, 300),
    []
  );

  useEffect(() => {
    searchResults.forEach((result) => {
      fetch(IPFS_GATEWAY_URL_4 + result.uri.split("/").at(-1))
        .then((res) => res.json())
        .then((data) => {
          result.image = IPFS_GATEWAY_URL_4 + data.image.split("/").at(-1);
        });
    });
  }, [searchResults]);
  return (
    <>
      <Button
        variant="outline"
        className={cn(
          "sen relative h-10 flex w-full sm:w-80 bg-muted/50 text-sm font-normal text-muted-foreground shadow-none sm:pr-12 md:w-40 lg:w-56 xl:w-80"
        )}
        onClick={() => setOpen(true)}
        {...props}
      >
        <span className="inline-flex sm:hidden md:hidden lg:inline-flex w-full text-start ">
          Search memecoins...
        </span>
        <span className="hidden sm:inline-flex md:inline-flex lg:hidden w-full text-start">
          Search...
        </span>
        <kbd className="pointer-events-none absolute right-[0.4rem] top-[0.4rem] hidden h-6 select-none items-center gap-1 rounded border bg-muted px-2 font-mono text-md font-medium opacity-100 sm:flex">
          <span className="text-sm">⌘</span>K
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        {paid ? (
          <>
            <CommandInput
              value={searchBarValue}
              onValueChange={(search) => {
                setSearchBarValue(search);
                debouncedSearch(search);
              }}
              placeholder="Type a ticker or search..."
            />
            <CommandList>
              <CommandEmpty>
                {searchState == 0
                  ? "No results found"
                  : searchState == 1
                  ? "Type a longer search term"
                  : "Loading..."}
              </CommandEmpty>
              <CommandGroup heading="Memecoins">
                {Array.isArray(
                  searchBarValue == "" ? leaderboard : searchResults
                ) &&
                  (searchBarValue == "" ? leaderboard : searchResults).map(
                    (navItem, id) => (
                      <CommandItem
                        key={id}
                        value={navItem.symbol + id}
                        onSelect={() => {
                          runCommand(() => router.push("/token/" + navItem.id));
                        }}
                        className="data-[selected='true']:bg-secondary cursor-pointer"
                      >
                        {navItem.image ? (
                          <img
                            src={navItem.image}
                            alt={navItem.symbol}
                            className="h-4 w-4 mr-1 rounded-full"
                            onError={(e: any) => {
                              e.target.onerror = null; // Prevent infinite loop
                              e.target.src = "/memecoins/placeholder.png";
                            }}
                          />
                        ) : (
                          <div className="h-4 w-4 mr-1 rounded-full animate-spin border-2 border-transparent border-t-accent"></div>
                        )}
                        <span>{navItem.symbol}</span>
                        <span className="text-accent">/ SOL</span>
                        <span className="ml-auto text-muted-foreground">
                          {navItem.name}
                        </span>
                      </CommandItem>
                    )
                  )}
              </CommandGroup>

              <CommandSeparator />
            </CommandList>
          </>
        ) : (
          <div className="h-[300px] flex flex-col justify-center">
            <UnlockNow text="Search and analyze all memecoins" />
          </div>
        )}
      </CommandDialog>
    </>
  );
}
