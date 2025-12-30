import { useState } from "react";
import { useGetMarkets } from "../lib/index";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Search } from "lucide-react";

export default function MarketExplorer() {
    // Fetch top 100 markets
    const { data: markets, isLoading } = useGetMarkets(100);
    const [filterText, setFilterText] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("ALL");
    const [sortBy, setSortBy] = useState("VOLUME_DESC");
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 20;

    // Extract unique categories for filter
    const categories = ["ALL", ...Array.from(new Set(markets?.map((m: any) => m.category || "Uncategorized"))).sort()] as string[];

    // 1. Filter
    const filteredMarkets = markets?.filter((m: any) => {
        const matchesSearch = m.question.toLowerCase().includes(filterText.toLowerCase());
        const matchesCategory = categoryFilter === "ALL" || m.category === categoryFilter;
        return matchesSearch && matchesCategory;
    }) || [];

    // 2. Sort
    const sortedMarkets = [...filteredMarkets].sort((a: any, b: any) => {
        if (sortBy === "VOLUME_DESC") return Number(b.volume) - Number(a.volume);
        if (sortBy === "PROB_DESC") return Number(b.probability) - Number(a.probability);
        if (sortBy === "PROB_ASC") return Number(a.probability) - Number(b.probability);
        return 0;
    });

    // 3. Paginate
    const totalPages = Math.ceil(sortedMarkets.length / ITEMS_PER_PAGE);
    const paginatedMarkets = sortedMarkets.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-4xl shadow-sm border border-gray-100">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Market Explorer</h2>
                    <p className="text-gray-500 text-sm">Discover and analyze active prediction markets.</p>
                </div>

                <div className="flex flex-wrap gap-3 w-full md:w-auto">
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            placeholder="Search markets..."
                            className="bg-gray-50 border-gray-200 pl-9 text-gray-900 focus-visible:ring-1 focus-visible:ring-blue-500 placeholder:text-gray-400 rounded-xl"
                            value={filterText}
                            onChange={(e) => {
                                setFilterText(e.target.value);
                                setCurrentPage(1); // Reset to page 1 on search
                            }}
                        />
                    </div>

                    {/* Category Filter */}
                    <div className="relative">
                        <select
                            value={categoryFilter}
                            onChange={(e) => {
                                setCategoryFilter(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-[160px] appearance-none bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                        >
                            {categories.map((cat) => (
                                <option key={cat} value={cat} className="bg-white text-gray-900">
                                    {cat}
                                </option>
                            ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                    </div>

                    {/* Sort Dropdown */}
                    <div className="relative">
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="w-[180px] appearance-none bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                        >
                            <option value="VOLUME_DESC" className="bg-white text-gray-900">🔥 Highest Volume</option>
                            <option value="PROB_DESC" className="bg-white text-gray-900">📈 High Probability</option>
                            <option value="PROB_ASC" className="bg-white text-gray-900">📉 Low Probability</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                    </div>
                </div>
            </div>

            <Card className="bg-white p-2 border border-gray-100 overflow-hidden shadow-card rounded-4xl">
                <Table>
                    <TableHeader className="bg-gray-50/50">
                        <TableRow className="border-b border-gray-100 hover:bg-transparent">
                            <TableHead className="w-[80px] text-gray-400 font-bold uppercase tracking-wider text-xs py-4 pl-4">Image</TableHead>
                            <TableHead className="min-w-[300px] text-gray-400 font-bold uppercase tracking-wider text-xs py-4">Market Question</TableHead>
                            <TableHead className="text-gray-400 font-bold uppercase tracking-wider text-xs py-4">Category</TableHead>
                            <TableHead className="text-right text-gray-400 font-bold uppercase tracking-wider text-xs py-4">Volume (24h)</TableHead>
                            <TableHead className="text-right text-gray-400 font-bold uppercase tracking-wider text-xs py-4">Probability</TableHead>
                            <TableHead className="text-right text-gray-400 font-bold uppercase tracking-wider text-xs py-4 pr-6">End Date</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow className="border-none">
                                <TableCell colSpan={6} className="h-32 text-center text-gray-500">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                        <p>Loading markets...</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : paginatedMarkets.length > 0 ? (
                            paginatedMarkets.map((market: any) => (
                                <TableRow key={market.id} className="border-b border-gray-50 last:border-0 hover:bg-blue-50/30 transition-colors group cursor-pointer">
                                    <TableCell className="pl-4 py-4">
                                        <img
                                            src={market.image}
                                            alt="Market"
                                            className="w-10 h-10 rounded-xl object-cover bg-gray-100 shadow-sm group-hover:scale-105 transition-transform duration-300"
                                            onError={(e) => (e.currentTarget.src = "https://polymarket.com/images/fallback.png")}
                                        />
                                    </TableCell>
                                    <TableCell className="py-4">
                                        <p className="font-semibold text-gray-900 line-clamp-2 text-sm group-hover:text-blue-600 transition-colors" title={market.question}>
                                            {market.question}
                                        </p>
                                    </TableCell>
                                    <TableCell className="py-4">
                                        <span className="px-2.5 py-1 rounded-lg text-xs bg-gray-100 text-gray-600 font-bold uppercase tracking-wider border border-gray-200">
                                            {market.category}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right font-mono text-gray-600 font-medium py-4">
                                        ${Number(market.volume).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                    </TableCell>
                                    <TableCell className="text-right py-4">
                                        <div className="flex items-center justify-end gap-2">
                                            <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-linear-to-r from-blue-400 to-blue-600 rounded-full"
                                                    style={{ width: `${(Number(market.probability) * 100).toFixed(0)}%` }}
                                                />
                                            </div>
                                            <span className="font-bold text-gray-900 text-sm w-10">
                                                {(Number(market.probability) * 100).toFixed(0)}%
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right text-gray-500 text-xs font-medium py-4 pr-6">
                                        {market.endDate ? new Date(market.endDate).toLocaleDateString() : "N/A"}
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={6} className="h-48 text-center text-gray-500">
                                    <div className="flex flex-col items-center justify-center gap-3 opacity-60">
                                        <Search className="w-8 h-8 text-gray-300" />
                                        <p>No markets found fitting your criteria.</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>

                {/* Pagination Controls */}
                {!isLoading && sortedMarkets.length > 0 && (
                    <div className="flex justify-between items-center p-4 bg-gray-50/30 border-t border-gray-100">
                        <div className="text-xs text-gray-400 font-medium pl-2">
                            Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, sortedMarkets.length)} of {sortedMarkets.length} markets
                        </div>
                        <div className="flex justify-center items-center gap-2">
                            <button
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold transition-all shadow-sm"
                            >
                                Previous
                            </button>

                            <div className="flex gap-1.5">
                                {(() => {
                                    let startPage = Math.max(1, currentPage - 2);
                                    let endPage = Math.min(totalPages, startPage + 4);

                                    if (endPage - startPage < 4) {
                                        startPage = Math.max(1, endPage - 4);
                                    }

                                    return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i).map((page) => (
                                        <button
                                            key={page}
                                            onClick={() => handlePageChange(page)}
                                            className={`w-8 h-8 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center justify-center ${currentPage === page
                                                ? "bg-blue-600 text-white shadow-blue-500/20"
                                                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300"
                                                }`}
                                        >
                                            {page}
                                        </button>
                                    ));
                                })()}
                            </div>

                            <button
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold transition-all shadow-sm"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
}
